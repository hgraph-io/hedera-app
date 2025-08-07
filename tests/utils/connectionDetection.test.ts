import { describe, it, expect } from 'vitest'

// Connection detection logic that should be extracted to a utility
export function detectConnectionMode(
  v1Connected: boolean,
  v1Session: any,
  universalProviderSession: any
): 'none' | 'v1' | 'v2' {
  // Check v2 connection first (universalProvider with namespaces)
  if (universalProviderSession && 
      (universalProviderSession.namespaces?.hedera || 
       universalProviderSession.namespaces?.eip155)) {
    // This is definitely a v2 connection
    return 'v2'
  } else if (v1Connected && v1Session) {
    // This is a v1 connection
    return 'v1'
  } else {
    return 'none'
  }
}

// Helper to determine namespace type
export function getV2Namespace(session: any): 'hedera' | 'eip155' | null {
  if (!session?.namespaces) return null
  if (session.namespaces.hedera) return 'hedera'
  if (session.namespaces.eip155) return 'eip155'
  return null
}

// Helper to check if session is v1
export function isV1Session(session: any): boolean {
  if (!session) return false
  // V1 sessions don't have namespaces or have empty namespaces
  return !session.namespaces || 
         (Object.keys(session.namespaces || {}).length === 0)
}

// Helper to check if session is v2
export function isV2Session(session: any): boolean {
  if (!session) return false
  // V2 sessions have hedera or eip155 namespaces
  return !!(session.namespaces?.hedera || session.namespaces?.eip155)
}

describe('Connection Detection Utilities', () => {
  describe('detectConnectionMode', () => {
    it('should return "none" when no connections are active', () => {
      const result = detectConnectionMode(false, null, null)
      expect(result).toBe('none')
    })

    it('should return "v1" for v1 connection without namespaces', () => {
      const v1Session = { topic: 'v1-session', namespaces: {} }
      const result = detectConnectionMode(true, v1Session, null)
      expect(result).toBe('v1')
    })

    it('should return "v2" for session with hedera namespace', () => {
      const v2Session = {
        namespaces: {
          hedera: { accounts: ['hedera:testnet:0.0.123'] }
        }
      }
      const result = detectConnectionMode(false, null, v2Session)
      expect(result).toBe('v2')
    })

    it('should return "v2" for session with eip155 namespace', () => {
      const v2Session = {
        namespaces: {
          eip155: { accounts: ['eip155:296:0xABC'] }
        }
      }
      const result = detectConnectionMode(false, null, v2Session)
      expect(result).toBe('v2')
    })

    it('should prioritize v2 over v1 when both are present', () => {
      const v1Session = { topic: 'v1', namespaces: {} }
      const v2Session = {
        namespaces: {
          hedera: { accounts: ['hedera:testnet:0.0.123'] }
        }
      }
      const result = detectConnectionMode(true, v1Session, v2Session)
      expect(result).toBe('v2')
    })

    it('should handle malformed sessions gracefully', () => {
      const malformedSession = { topic: 'test' } // Missing namespaces
      const result = detectConnectionMode(true, malformedSession, malformedSession)
      expect(result).toBe('v1') // Falls back to v1 if connected flag is true
    })
  })

  describe('getV2Namespace', () => {
    it('should return "hedera" for hedera namespace', () => {
      const session = {
        namespaces: {
          hedera: { accounts: [] }
        }
      }
      expect(getV2Namespace(session)).toBe('hedera')
    })

    it('should return "eip155" for eip155 namespace', () => {
      const session = {
        namespaces: {
          eip155: { accounts: [] }
        }
      }
      expect(getV2Namespace(session)).toBe('eip155')
    })

    it('should return null for no namespaces', () => {
      expect(getV2Namespace({})).toBe(null)
      expect(getV2Namespace(null)).toBe(null)
      expect(getV2Namespace(undefined)).toBe(null)
    })

    it('should prioritize hedera over eip155 if both exist', () => {
      const session = {
        namespaces: {
          hedera: { accounts: [] },
          eip155: { accounts: [] }
        }
      }
      expect(getV2Namespace(session)).toBe('hedera')
    })
  })

  describe('isV1Session', () => {
    it('should return true for session without namespaces', () => {
      expect(isV1Session({ topic: 'v1' })).toBe(true)
    })

    it('should return true for session with empty namespaces', () => {
      expect(isV1Session({ topic: 'v1', namespaces: {} })).toBe(true)
    })

    it('should return false for session with v2 namespaces', () => {
      const v2Session = {
        namespaces: { hedera: { accounts: [] } }
      }
      expect(isV1Session(v2Session)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isV1Session(null)).toBe(false)
      expect(isV1Session(undefined)).toBe(false)
    })
  })

  describe('isV2Session', () => {
    it('should return true for hedera namespace', () => {
      const session = {
        namespaces: { hedera: { accounts: [] } }
      }
      expect(isV2Session(session)).toBe(true)
    })

    it('should return true for eip155 namespace', () => {
      const session = {
        namespaces: { eip155: { accounts: [] } }
      }
      expect(isV2Session(session)).toBe(true)
    })

    it('should return true for both namespaces', () => {
      const session = {
        namespaces: {
          hedera: { accounts: [] },
          eip155: { accounts: [] }
        }
      }
      expect(isV2Session(session)).toBe(true)
    })

    it('should return false for v1 sessions', () => {
      expect(isV2Session({ topic: 'v1' })).toBe(false)
      expect(isV2Session({ namespaces: {} })).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isV2Session(null)).toBe(false)
      expect(isV2Session(undefined)).toBe(false)
    })

    it('should return false for other namespaces', () => {
      const session = {
        namespaces: { 
          solana: { accounts: [] } // Not hedera or eip155
        }
      }
      expect(isV2Session(session)).toBe(false)
    })
  })
})

// Additional test cases for edge scenarios
describe('Edge Cases', () => {
  describe('Session State Transitions', () => {
    it('should handle rapid connection mode changes', () => {
      // Start with no connection
      let mode = detectConnectionMode(false, null, null)
      expect(mode).toBe('none')
      
      // Connect v1
      const v1Session = { topic: 'v1', namespaces: {} }
      mode = detectConnectionMode(true, v1Session, null)
      expect(mode).toBe('v1')
      
      // Immediately connect v2 (should override)
      const v2Session = {
        namespaces: { hedera: { accounts: [] } }
      }
      mode = detectConnectionMode(true, v1Session, v2Session)
      expect(mode).toBe('v2')
      
      // Disconnect v2 (falls back to v1)
      mode = detectConnectionMode(true, v1Session, null)
      expect(mode).toBe('v1')
      
      // Disconnect all
      mode = detectConnectionMode(false, null, null)
      expect(mode).toBe('none')
    })
  })

  describe('Namespace Detection Edge Cases', () => {
    it('should handle mixed namespace scenarios', () => {
      // Session with unknown namespace alongside known ones
      const mixedSession = {
        namespaces: {
          hedera: { accounts: [] },
          unknown: { accounts: [] }
        }
      }
      expect(getV2Namespace(mixedSession)).toBe('hedera')
      expect(isV2Session(mixedSession)).toBe(true)
    })

    it('should handle corrupted namespace data', () => {
      const corruptedSession = {
        namespaces: {
          hedera: null, // Corrupted data
          eip155: { accounts: [] }
        }
      }
      expect(getV2Namespace(corruptedSession)).toBe('eip155')
      expect(isV2Session(corruptedSession)).toBe(true)
    })
  })
})