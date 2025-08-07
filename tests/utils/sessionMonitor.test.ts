import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionMonitor } from '../../src/utils/sessionMonitor'
import type UniversalProvider from '@walletconnect/universal-provider'

describe('SessionMonitor', () => {
  let mockProvider: Partial<UniversalProvider>
  let sessionMonitor: SessionMonitor

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    
    // Mock provider
    mockProvider = {
      session: null,
      disconnect: vi.fn().mockResolvedValue(undefined),
    }
    
    sessionMonitor = new SessionMonitor(mockProvider as UniversalProvider)
  })

  describe('validateSession', () => {
    it('returns false when no session exists', async () => {
      const result = await sessionMonitor.validateSession()
      expect(result).toBe(false)
    })

    it('returns false when session is expired', async () => {
      mockProvider.session = {
        expiry: Math.floor(Date.now() / 1000) - 1000, // Expired 1000 seconds ago
        namespaces: { hedera: {} },
      } as any

      const result = await sessionMonitor.validateSession()
      expect(result).toBe(false)
    })

    it('returns true when session has hedera namespace', async () => {
      mockProvider.session = {
        expiry: Math.floor(Date.now() / 1000) + 1000, // Expires in 1000 seconds
        namespaces: { hedera: {} },
      } as any

      const result = await sessionMonitor.validateSession()
      expect(result).toBe(true)
    })

    it('returns true when session has eip155 namespace', async () => {
      mockProvider.session = {
        expiry: Math.floor(Date.now() / 1000) + 1000,
        namespaces: { eip155: {} },
      } as any

      const result = await sessionMonitor.validateSession()
      expect(result).toBe(true)
    })

    it('returns false when session has no valid namespaces', async () => {
      mockProvider.session = {
        expiry: Math.floor(Date.now() / 1000) + 1000,
        namespaces: {},
      } as any

      const result = await sessionMonitor.validateSession()
      expect(result).toBe(false)
    })

    it('returns false when validation throws error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockProvider.session = {
        get expiry() {
          throw new Error('Test error')
        },
      } as any

      const result = await sessionMonitor.validateSession()
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Session validation failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('prevents concurrent validation', async () => {
      mockProvider.session = {
        expiry: Math.floor(Date.now() / 1000) + 1000,
        namespaces: { hedera: {} },
      } as any

      // Directly test the mutex behavior by manually controlling isValidating
      // First, set isValidating to true to simulate an ongoing validation
      ;(sessionMonitor as any).isValidating = true;
      
      // Try to validate while another validation is in progress
      const result = await sessionMonitor.validateSession();
      
      // Should return false immediately due to mutex
      expect(result).toBe(false);
      
      // Reset isValidating
      ;(sessionMonitor as any).isValidating = false;
      
      // Now validation should work normally
      const result2 = await sessionMonitor.validateSession();
      expect(result2).toBe(true);
    })
  })

  describe('cleanupInvalidSessions', () => {
    it('clears WalletConnect storage keys', async () => {
      // Add some test keys to localStorage
      localStorage.setItem('wc@2:session', 'test')
      localStorage.setItem('walletconnect', 'test')
      localStorage.setItem('WC_USER_PREF', 'test')
      localStorage.setItem('regular-key', 'test')

      await sessionMonitor.cleanupInvalidSessions()

      expect(localStorage.getItem('wc@2:session')).toBeNull()
      expect(localStorage.getItem('walletconnect')).toBeNull()
      expect(localStorage.getItem('WC_USER_PREF')).toBeNull()
      expect(localStorage.getItem('regular-key')).toBe('test') // Should not be cleared
    })

    it('disconnects existing session', async () => {
      mockProvider.session = { topic: 'test-topic' } as any

      await sessionMonitor.cleanupInvalidSessions()

      expect(mockProvider.disconnect).toHaveBeenCalled()
    })

    it('handles disconnect error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockProvider.session = { topic: 'test-topic' } as any
      mockProvider.disconnect = vi.fn().mockRejectedValue(new Error('Disconnect failed'))

      await sessionMonitor.cleanupInvalidSessions()

      expect(consoleSpy).toHaveBeenCalledWith('Session cleanup failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('handles missing disconnect method', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockProvider.session = { topic: 'test-topic' } as any
      mockProvider.disconnect = undefined

      await sessionMonitor.cleanupInvalidSessions()

      expect(consoleSpy).toHaveBeenCalledWith('Session cleanup failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})