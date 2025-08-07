import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

    await waitFor(() => {
      expect(screen.getByText('Test Child')).toBeInTheDocument()
    })

    expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_accounts' })
  })

  it('shows error message when connection is invalid', async () => {
    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: false })
    mockRequest.mockResolvedValue([])

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Connection state mismatch detected. Please reconnect your wallet.')).toBeInTheDocument()
    })

    expect(screen.queryByText('Test Child')).not.toBeInTheDocument()
  })

  it('calls onConnectionError when validation fails', async () => {
    const mockOnConnectionError = vi.fn()
    const mockError = new Error('Connection failed')
    
    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: false })
    mockRequest.mockRejectedValue(mockError)

    render(
      <ConnectionWrapper onConnectionError={mockOnConnectionError}>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    await waitFor(() => {
      expect(mockOnConnectionError).toHaveBeenCalledWith(mockError)
    })

    expect(screen.getByText('Connection state mismatch detected. Please reconnect your wallet.')).toBeInTheDocument()
  })

  it('refreshes page when refresh button is clicked', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Connection state mismatch detected. Please reconnect your wallet.')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh Page')
    refreshButton.click()

    expect(mockReload).toHaveBeenCalled()
  })

  it('does not validate when modal is open', () => {
    mockUseAppKitAccount.mockReturnValue({ isConnected: true, address: '0x123' })
    mockUseAppKitState.mockReturnValue({ open: true })

    render(
      <ConnectionWrapper>
        <div>Test Child</div>
      </ConnectionWrapper>
    )

    expect(screen.getByText('Test Child')).toBeInTheDocument()
    expect(mockRequest).not.toHaveBeenCalled()
  })
})