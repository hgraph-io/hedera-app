import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock the config module
vi.mock('../src/config', () => {
  const mockUniversalProviderOn = vi.fn()
  const mockUniversalProviderOff = vi.fn()
  const mockPairingEventsOn = vi.fn()
  const mockPairingEventsOff = vi.fn()
  
  return {
    projectId: 'test-project-id',
    metadata: { name: 'Test App', url: 'https://test.com' },
    networks: [],
    nativeHederaAdapter: {},
    eip155HederaAdapter: {},
    universalProvider: {
      on: mockUniversalProviderOn,
      off: mockUniversalProviderOff,
      client: {
        core: {
          pairing: {
            events: {
              on: mockPairingEventsOn,
              off: mockPairingEventsOff,
            },
          },
        },
      },
      session: null,
    },
    // Export the mocks so we can access them in tests
    __mocks: {
      universalProviderOn: mockUniversalProviderOn,
      universalProviderOff: mockUniversalProviderOff,
      pairingEventsOn: mockPairingEventsOn,
      pairingEventsOff: mockPairingEventsOff,
    },
  }
})

// Mock SessionMonitor
vi.mock('../src/utils/sessionMonitor', () => {
  const mockValidateSession = vi.fn()
  const mockCleanupInvalidSessions = vi.fn()
  
  return {
    SessionMonitor: vi.fn().mockImplementation(() => ({
      validateSession: mockValidateSession,
      cleanupInvalidSessions: mockCleanupInvalidSessions,
    })),
    __mocks: {
      validateSession: mockValidateSession,
      cleanupInvalidSessions: mockCleanupInvalidSessions,
    },
  }
})

// Mock debug utilities
vi.mock('../src/utils/debug', () => ({}))

// Mock Reown AppKit
vi.mock('@reown/appkit/react', () => {
  const mockDisconnect = vi.fn()
  
  return {
    createAppKit: vi.fn(() => ({ subscribe: vi.fn() })),
    useDisconnect: () => ({ disconnect: mockDisconnect }),
    useAppKitAccount: () => ({ isConnected: false, address: undefined }),
    useAppKitState: () => ({ open: false }),
    __mocks: {
      disconnect: mockDisconnect,
    },
  }
})

// Mock components
vi.mock('../src/components/ActionButtonList', () => ({
  ActionButtonList: () => null,
}))

vi.mock('../src/components/InfoList', () => ({
  InfoList: () => null,
}))

vi.mock('../src/components/ConnectionWrapper', () => ({
  ConnectionWrapper: ({ children }: { children: React.ReactNode }) => children,
}))

// Import modules to get mocks
import * as configModule from '../src/config'
import * as sessionMonitorModule from '../src/utils/sessionMonitor'
import * as appKitModule from '@reown/appkit/react'

// Extract mocks
const mockDisconnect = (appKitModule as any).__mocks.disconnect
const mockValidateSession = (sessionMonitorModule as any).__mocks.validateSession
const mockCleanupInvalidSessions = (sessionMonitorModule as any).__mocks.cleanupInvalidSessions
const mockUniversalProviderOn = (configModule as any).__mocks.universalProviderOn

// Import the component after mocks are set up
import App from '../src/App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockValidateSession.mockResolvedValue(true)
    mockCleanupInvalidSessions.mockResolvedValue(undefined)
    mockDisconnect.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders header', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', {
        name: /Hedera App Example using Reown AppKit and Hedera/i,
      }),
    ).toBeInTheDocument()
  })

  it('handles disconnect error when session has eip155 namespace', async () => {
    // Setup: mock a failed disconnect
    mockDisconnect.mockRejectedValue(new TypeError('Mock disconnect error'))
    
    // Mock session with eip155 namespace
    configModule.universalProvider.session = {
      namespaces: {
        eip155: {},
      },
    }

    // Setup: spy on console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    // Get the handleDisconnect function that was passed to the 'on' method
    const sessionDeleteHandler = mockUniversalProviderOn.mock.calls.find(
      (call: any) => call[0] === 'session_delete',
    )?.[1]

    expect(sessionDeleteHandler).toBeDefined()

    // Trigger the disconnect handler
    await act(async () => {
      await sessionDeleteHandler()
    })

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Disconnect error:',
      expect.objectContaining({
        message: 'Mock disconnect error',
      }),
    )

    consoleSpy.mockRestore()
  })

  it('validates session periodically', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    
    render(<App />)
    
    // Wait for initial validation
    await vi.waitFor(() => {
      expect(mockValidateSession).toHaveBeenCalledTimes(1)
    })
    
    // Clear existing calls
    mockValidateSession.mockClear()
    
    // Advance time by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000)
    })
    
    // Wait for the next validation
    await vi.waitFor(() => {
      expect(mockValidateSession).toHaveBeenCalledTimes(1)
    })
    
    vi.useRealTimers()
  }, 10000)

  it('cleans up invalid sessions when detected', async () => {
    // Mock validation to return false
    mockValidateSession.mockResolvedValue(false)
    
    // Set a session to trigger cleanup
    configModule.universalProvider.session = { namespaces: { eip155: {} } }
    
    render(<App />)
    
    await waitFor(() => {
      expect(mockValidateSession).toHaveBeenCalled()
      expect(mockCleanupInvalidSessions).toHaveBeenCalled()
    })
  })

  it('handles WalletConnect internal errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<App />)
    
    // Simulate an error event
    const errorEvent = new ErrorEvent('error', {
      error: new Error('Cannot read properties of undefined'),
    })
    
    await act(async () => {
      window.dispatchEvent(errorEvent)
    })
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('WalletConnect internal error detected')
      expect(mockCleanupInvalidSessions).toHaveBeenCalled()
    })
    
    consoleSpy.mockRestore()
  })
})