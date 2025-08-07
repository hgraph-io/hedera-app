# Wallet Connection Issue Analysis & Recommendations

## Issue Summary

The client is experiencing intermittent connection issues where:
1. An error occurs during wallet connection/disconnection (shown in console)
2. UI shows as connected but HashPack extension shows 0 connections
3. The issue happens randomly and cannot be reliably reproduced
4. Affects both mainnet and testnet

## Root Cause Analysis

### 1. Session State Synchronization Issue
The error appears to be a race condition in the WalletConnect library when handling extension connections. The specific error "Cannot read properties of undefined" at line 290 (`connectExtension`) suggests internal WalletConnect state corruption.

### 2. Current Implementation Issues

#### In Client's Code:
- **Optimistic State Updates**: Setting `sessionState = "connected"` before verifying connection success
- **Missing Session Validation**: No verification that extension connection actually succeeded
- **Incomplete Error Handling**: Not catching WalletConnect internal errors properly
- **No Connection Mutex**: Multiple concurrent connection attempts possible

#### In hedera-app Demo:
- Uses AppKit's built-in connection management
- Relies on `session_delete` and `pairing_delete` events for cleanup
- No explicit session validation before operations
- No recovery mechanism for corrupted sessions

### 3. Library-Level Issues
The `connectExtension` method in hedera-wallet-connect library:
- Doesn't validate extension state before attempting connection
- No timeout handling for hanging connections
- Limited error recovery for internal WalletConnect failures

## Recommendations for hedera-app

### 1. Add Session State Monitor
Create a new utility for monitoring and validating session state:

```typescript
// src/utils/sessionMonitor.ts
import { UniversalProvider } from '@walletconnect/universal-provider'

export class SessionMonitor {
  private provider: UniversalProvider
  private isValidating = false
  
  constructor(provider: UniversalProvider) {
    this.provider = provider
  }
  
  async validateSession(): Promise<boolean> {
    if (this.isValidating) return false
    
    try {
      this.isValidating = true
      
      // Check if session exists
      if (!this.provider.session) return false
      
      // Check if session is expired
      const session = this.provider.session
      if (session.expiry && new Date(session.expiry * 1000) < new Date()) {
        return false
      }
      
      // Check if we have valid namespaces
      const hasValidNamespaces = !!(
        session.namespaces?.hedera || 
        session.namespaces?.eip155
      )
      
      return hasValidNamespaces
    } catch (error) {
      console.error('Session validation failed:', error)
      return false
    } finally {
      this.isValidating = false
    }
  }
  
  async cleanupInvalidSessions() {
    try {
      // Clear WalletConnect storage
      const wcKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('wc@') || 
        key.startsWith('walletconnect') ||
        key.includes('WC')
      )
      wcKeys.forEach(key => localStorage.removeItem(key))
      
      // Disconnect any existing sessions
      if (this.provider.session) {
        await this.provider.disconnect()
      }
    } catch (error) {
      console.error('Session cleanup failed:', error)
    }
  }
}
```

### 2. Enhanced App.tsx with Session Recovery
Update the main App component with better error handling:

```typescript
// src/App.tsx - Add these imports and modifications
import { SessionMonitor } from './utils/sessionMonitor'

// Inside App component, add:
const sessionMonitor = useRef(new SessionMonitor(universalProvider))

// Add session validation effect
useEffect(() => {
  const validateAndRecover = async () => {
    const isValid = await sessionMonitor.current.validateSession()
    if (!isValid && universalProvider.session) {
      console.warn('Invalid session detected, cleaning up...')
      await sessionMonitor.current.cleanupInvalidSessions()
      clearState()
    }
  }
  
  // Validate on mount and periodically
  validateAndRecover()
  const interval = setInterval(validateAndRecover, 30000) // Every 30 seconds
  
  return () => clearInterval(interval)
}, [])

// Enhanced disconnect handler
const handleDisconnect = async () => {
  try {
    // Validate session before disconnect
    const isValid = await sessionMonitor.current.validateSession()
    
    if (!isValid) {
      // Force cleanup if session is invalid
      await sessionMonitor.current.cleanupInvalidSessions()
    } else if (universalProvider.session?.namespaces?.eip155) {
      await disconnect()
    }
    
    clearState()
  } catch (error) {
    console.error('Disconnect error:', error)
    // Force cleanup on error
    await sessionMonitor.current.cleanupInvalidSessions()
    clearState()
  }
}

// Add error boundary for session errors
useEffect(() => {
  const handleError = (event: ErrorEvent) => {
    if (event.error?.message?.includes('Cannot read properties of undefined')) {
      console.error('WalletConnect internal error detected')
      sessionMonitor.current.cleanupInvalidSessions()
      clearState()
    }
  }
  
  window.addEventListener('error', handleError)
  return () => window.removeEventListener('error', handleError)
}, [])
```

### 3. Connection Wrapper Component
Create a wrapper to handle connection state:

```typescript
// src/components/ConnectionWrapper.tsx
import { ReactNode, useEffect, useState } from 'react'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { universalProvider } from '../config'

interface ConnectionWrapperProps {
  children: ReactNode
  onConnectionError?: (error: Error) => void
}

export function ConnectionWrapper({ children, onConnectionError }: ConnectionWrapperProps) {
  const { isConnected } = useAppKitAccount()
  const { open } = useAppKitState()
  const [isValidConnection, setIsValidConnection] = useState(true)
  
  useEffect(() => {
    const checkConnection = async () => {
      if (isConnected && !open) {
        // Verify connection is actually valid
        try {
          const accounts = await universalProvider.request({
            method: 'eth_accounts'
          })
          setIsValidConnection(accounts.length > 0)
        } catch (error) {
          console.error('Connection validation failed:', error)
          setIsValidConnection(false)
          onConnectionError?.(error as Error)
        }
      }
    }
    
    checkConnection()
  }, [isConnected, open, onConnectionError])
  
  if (isConnected && !isValidConnection) {
    return (
      <div className="connection-error">
        <p>Connection state mismatch detected. Please reconnect your wallet.</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    )
  }
  
  return <>{children}</>
}
```

### 4. Update ActionButtonList Component
Add connection validation before method execution:

```typescript
// src/components/ActionButtonList.tsx - Add to executeMethod function
const executeMethod = async (methodName: string, params: Record<string, string>) => {
  setIsLoading(true)
  try {
    // Validate connection before execution
    if (isConnected && walletProvider) {
      try {
        // Quick validation check
        await walletProvider.request({ method: 'eth_chainId' })
      } catch (validationError) {
        console.error('Connection validation failed:', validationError)
        // Force reconnection
        alert('Connection lost. Please reconnect your wallet.')
        setIsLoading(false)
        return
      }
    }
    
    // ... rest of the existing code
  } catch (error) {
    // ... existing error handling
  }
}
```

### 5. Add Debug Utilities
Create debugging helpers:

```typescript
// src/utils/debug.ts
export const debugWalletState = () => {
  const universalProvider = (window as any).universalProvider
  const appKitState = (window as any).__REOWN_APPKIT_STATE__
  
  console.group('Wallet Debug Info')
  console.log('Provider Session:', universalProvider?.session)
  console.log('AppKit State:', appKitState)
  console.log('LocalStorage WC Keys:', 
    Object.keys(localStorage).filter(k => 
      k.includes('wallet') || k.includes('wc') || k.includes('WC')
    )
  )
  console.groupEnd()
}

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).debugWallet = debugWalletState
}
```

## Implementation Priority

1. **High Priority**: Implement SessionMonitor utility and enhanced disconnect handling
2. **Medium Priority**: Add connection validation wrapper and update method execution
3. **Low Priority**: Debug utilities for troubleshooting

## Testing Recommendations

1. Test rapid connect/disconnect cycles
2. Test with multiple wallets simultaneously
3. Test session expiry scenarios
4. Test network switching during active sessions
5. Monitor for the specific error in console logs

## Long-term Solutions

1. Consider implementing a connection queue to prevent concurrent attempts
2. Add telemetry to track connection failures
3. Implement automatic session recovery with user notification
4. Consider fallback connection methods if extension fails

## Notes for Client's Implementation

The client's code needs these critical fixes:
1. Add mutex to prevent concurrent connections
2. Verify connection success before setting state
3. Implement proper timeout handling
4. Add session validation before operations
5. Implement force cleanup on errors

These recommendations should significantly improve connection stability and provide better error recovery mechanisms.