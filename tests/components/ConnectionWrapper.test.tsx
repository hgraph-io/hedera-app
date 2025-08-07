import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionWrapper } from '../../src/components/ConnectionWrapper'
import { universalProvider } from '../../src/config'

// Mock the modules
vi.mock('@reown/appkit/react', () => ({
  useAppKitAccount: vi.fn(),
  useAppKitState: vi.fn(),
}))

vi.mock('../../src/config', () => ({
  universalProvider: {
    request: vi.fn(),
  },
}))

// Import the actual functions to get their types
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'

describe('ConnectionWrapper', () => {
  const mockUseAppKitAccount = vi.mocked(useAppKitAccount)
  const mockUseAppKitState = vi.mocked(useAppKitState)
  const mockRequest = vi.mocked(universalProvider.request)

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear sessionStorage before each test
    sessionStorage.clear()
    // Use fake timers for controlled testing
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders children when not connected', () => {
    mockUseAppKitAccount.mockReturnValue({ isConnected: false, address: undefined })
    mockUseAppKitState.mockReturnValue({ open: false })

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('renders children when connected and valid', async () => {
    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: false })
    mockRequest.mockResolvedValue(['0x123'])

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    // Wait for async validation to complete
    await vi.runAllTimersAsync()

    expect(screen.getByText('Test Child')).toBeInTheDocument()
    expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_accounts' })
  })

  it('auto-refreshes when connection is invalid', async () => {
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: false })
    mockRequest.mockResolvedValue([])

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    // Wait for async validation to complete
    await vi.runAllTimersAsync()

    // Should show refreshing message
    expect(screen.getByText('Refreshing connection...')).toBeInTheDocument()
    expect(screen.queryByText('Test Child')).not.toBeInTheDocument()

    // Advance timer to trigger reload (1000ms timeout)
    vi.advanceTimersByTime(1000)

    expect(mockReload).toHaveBeenCalled()
    expect(sessionStorage.getItem('connectionRefreshAttempts')).toBe('1')
  })

  it('calls onConnectionError and auto-refreshes when validation fails', async () => {
    const mockOnConnectionError = vi.fn()
    const mockError = new Error('Connection failed')
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })
    
    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: false })
    mockRequest.mockRejectedValue(mockError)

    render(
      <ConnectionWrapper onConnectionError={mockOnConnectionError}>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    // Wait for async validation to complete
    await vi.runAllTimersAsync()

    expect(mockOnConnectionError).toHaveBeenCalledWith(mockError)
    expect(screen.getByText('Refreshing connection...')).toBeInTheDocument()
    
    // Advance timer to trigger reload
    vi.advanceTimersByTime(1000)

    expect(mockReload).toHaveBeenCalled()
    expect(sessionStorage.getItem('connectionRefreshAttempts')).toBe('1')
  })


  it('does not validate when modal is open', async () => {
    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: true })

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    // Run any pending timers
    await vi.runAllTimersAsync()

    expect(screen.getByText('Test Child')).toBeInTheDocument()
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('respects maximum refresh attempts', async () => {
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    // Set sessionStorage to max attempts - 1
    sessionStorage.setItem('connectionRefreshAttempts', '2')

    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: false })
    mockRequest.mockResolvedValue([])

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    // Wait for async validation
    await vi.runAllTimersAsync()

    // Should show refreshing and increment attempts
    expect(screen.getByText('Refreshing connection...')).toBeInTheDocument()
    
    // Advance timer to trigger reload
    vi.advanceTimersByTime(1000)

    expect(mockReload).toHaveBeenCalled()
    expect(sessionStorage.getItem('connectionRefreshAttempts')).toBe('3')
  })

  it('does not refresh when max attempts reached', async () => {
    const mockReload = vi.fn()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    // Set sessionStorage to max attempts
    sessionStorage.setItem('connectionRefreshAttempts', '3')

    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: false })
    mockRequest.mockResolvedValue([])

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    // Wait for async validation
    await vi.runAllTimersAsync()

    // Should show refreshing but NOT reload
    expect(screen.getByText('Refreshing connection...')).toBeInTheDocument()
    
    // Advance timer - should not trigger reload
    vi.advanceTimersByTime(1000)

    expect(mockReload).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Max refresh attempts reached. Please manually reconnect.')
    expect(sessionStorage.getItem('connectionRefreshAttempts')).toBeNull()
    
    consoleErrorSpy.mockRestore()
  })
})