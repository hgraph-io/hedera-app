import { describe, it, expect } from 'vitest'
import { 
  detectConnectionMode, 
  getV2Namespace, 
  isV1Session, 
  isV2Session 
} from './utils/connectionDetection.test'

describe('Connection Mode Detection - Simple Tests', () => {
  describe('Connection Mode Logic', () => {
    it('should correctly identify no connection', () => {
      const mode = detectConnectionMode(false, null, null)
      expect(mode).toBe('none')
    })

    it('should correctly identify v1 connection', () => {
      const v1Session = { topic: 'v1-session', namespaces: {} }
      const mode = detectConnectionMode(true, v1Session, null)
      expect(mode).toBe('v1')
    })

    it('should correctly identify v2 hedera connection', () => {
      const v2Session = {
        namespaces: {
          hedera: {
            accounts: ['hedera:testnet:0.0.12345'],
            methods: ['hedera_signMessage'],
            events: []
          }
        }
      }
      const mode = detectConnectionMode(false, null, v2Session)
      expect(mode).toBe('v2')
      expect(getV2Namespace(v2Session)).toBe('hedera')
    })

    it('should correctly identify v2 eip155 connection', () => {
      const v2Session = {
        namespaces: {
          eip155: {
            accounts: ['eip155:296:0xABCDEF'],
            methods: ['eth_sendTransaction'],
            events: []
          }
        }
      }
      const mode = detectConnectionMode(false, null, v2Session)
      expect(mode).toBe('v2')
      expect(getV2Namespace(v2Session)).toBe('eip155')
    })

    it('should prioritize v2 over v1', () => {
      const v1Session = { topic: 'v1', namespaces: {} }
      const v2Session = {
        namespaces: {
          hedera: { accounts: ['hedera:testnet:0.0.12345'] }
        }
      }
      const mode = detectConnectionMode(true, v1Session, v2Session)
      expect(mode).toBe('v2')
    })
  })

  describe('Session Type Detection', () => {
    it('should identify v1 sessions correctly', () => {
      expect(isV1Session({ topic: 'v1' })).toBe(true)
      expect(isV1Session({ topic: 'v1', namespaces: {} })).toBe(true)
      expect(isV1Session({ 
        namespaces: { hedera: { accounts: [] } } 
      })).toBe(false)
    })

    it('should identify v2 sessions correctly', () => {
      expect(isV2Session({ 
        namespaces: { hedera: { accounts: [] } } 
      })).toBe(true)
      expect(isV2Session({ 
        namespaces: { eip155: { accounts: [] } } 
      })).toBe(true)
      expect(isV2Session({ topic: 'v1' })).toBe(false)
      expect(isV2Session({ namespaces: {} })).toBe(false)
    })
  })

  describe('Critical Scenarios', () => {
    it('should never show v1 when v2 is connected', () => {
      // This is the key test for the bug we fixed
      const scenarios = [
        {
          v1Connected: true,
          v1Session: { topic: 'any' },
          v2Session: { namespaces: { hedera: { accounts: ['test'] } } },
          expected: 'v2'
        },
        {
          v1Connected: true,
          v1Session: { topic: 'any' },
          v2Session: { namespaces: { eip155: { accounts: ['test'] } } },
          expected: 'v2'
        },
        {
          v1Connected: false,
          v1Session: null,
          v2Session: { namespaces: { hedera: { accounts: ['test'] } } },
          expected: 'v2'
        }
      ]

      scenarios.forEach(({ v1Connected, v1Session, v2Session, expected }) => {
        const mode = detectConnectionMode(v1Connected, v1Session, v2Session)
        expect(mode).toBe(expected)
      })
    })

    it('should handle namespace detection priority', () => {
      // Hedera namespace should be detected before eip155 if both exist
      const dualNamespaceSession = {
        namespaces: {
          hedera: { accounts: ['hedera:testnet:0.0.123'] },
          eip155: { accounts: ['eip155:296:0xABC'] }
        }
      }
      expect(getV2Namespace(dualNamespaceSession)).toBe('hedera')
    })
  })
})