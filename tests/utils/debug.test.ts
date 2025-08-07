import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('debug utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear window properties
    delete (window as any).universalProvider
    delete (window as any).__REOWN_APPKIT_STATE__
    delete (window as any).debugWallet
    // Clear localStorage
    localStorage.clear()
    // Clear module cache to ensure fresh imports
    vi.resetModules()
  })

  it('debugWalletState logs wallet debug information', async () => {
    // Setup mocks first
    const mockProvider = {
      session: { topic: 'test-session' },
    }
    const mockAppKitState = {
      connected: true,
      chainId: 1,
    }
    
    ;(window as any).universalProvider = mockProvider
    ;(window as any).__REOWN_APPKIT_STATE__ = mockAppKitState
    
    // Add some wallet-related localStorage items
    localStorage.setItem('walletconnect', 'test')
    localStorage.setItem('wc@2:session', 'test')
    localStorage.setItem('regular-key', 'test')
    
    // Spy on console methods
    const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    
    // Import and call the function
    const debugModule = await import('../../src/utils/debug')
    debugModule.debugWalletState()
    
    // Verify console calls
    expect(consoleGroupSpy).toHaveBeenCalledWith('Wallet Debug Info')
    expect(consoleLogSpy).toHaveBeenCalledWith('Provider Session:', mockProvider.session)
    expect(consoleLogSpy).toHaveBeenCalledWith('AppKit State:', mockAppKitState)
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'LocalStorage WC Keys:',
      expect.arrayContaining(['walletconnect', 'wc@2:session'])
    )
    expect(consoleGroupEndSpy).toHaveBeenCalled()
    
    // Restore console
    consoleGroupSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleGroupEndSpy.mockRestore()
  })

  it('handles missing window properties gracefully', async () => {
    const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    
    // Import and call without setting window properties
    const debugModule = await import('../../src/utils/debug')
    debugModule.debugWalletState()
    
    expect(consoleGroupSpy).toHaveBeenCalledWith('Wallet Debug Info')
    expect(consoleLogSpy).toHaveBeenCalledWith('Provider Session:', undefined)
    expect(consoleLogSpy).toHaveBeenCalledWith('AppKit State:', undefined)
    expect(consoleLogSpy).toHaveBeenCalledWith('LocalStorage WC Keys:', [])
    expect(consoleGroupEndSpy).toHaveBeenCalled()
    
    // Restore console
    consoleGroupSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleGroupEndSpy.mockRestore()
  })

  it('is available on window object', async () => {
    // Import the module to execute the side effect
    const debugModule = await import('../../src/utils/debug')
    
    expect(typeof (window as any).debugWallet).toBe('function')
    expect((window as any).debugWallet).toBe(debugModule.debugWalletState)
  })
})