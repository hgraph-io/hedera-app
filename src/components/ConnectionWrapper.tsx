import { ReactNode, useEffect, useState, useRef } from 'react'
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasCheckedRef = useRef(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckTimeRef = useRef<number>(0)
  const checkDebounceMs = 2000 // Minimum time between checks
  
  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])
  
  useEffect(() => {
    const checkConnection = async () => {
      // Get current time
      const now = Date.now()
      
      // Skip if we're already refreshing
      if (isRefreshing) {
        return
      }
      
      // Skip if we've checked recently (debounce)
      if (now - lastCheckTimeRef.current < checkDebounceMs) {
        return
      }
      
      // Skip if we've already validated this connection successfully
      if (hasCheckedRef.current && isValidConnection) {
        return
      }
      
      if (isConnected && !open) {
        // Update last check time
        lastCheckTimeRef.current = now
        
        // Only validate if this is a new connection or previously invalid
        if (!hasCheckedRef.current || !isValidConnection) {
          hasCheckedRef.current = true
          
          // Verify connection is actually valid
          try {
            const accounts = await universalProvider.request({
              method: 'eth_accounts'
            }) as string[]
            const isValid = accounts.length > 0
            setIsValidConnection(isValid)
            
            // Auto-refresh if connection is invalid (only once)
            if (!isValid && !isRefreshing) {
              console.log('Connection state mismatch detected. Auto-refreshing page once...')
              setIsRefreshing(true)
              
              // Store flag in sessionStorage to prevent infinite loops
              const refreshAttempts = parseInt(sessionStorage.getItem('connectionRefreshAttempts') || '0')
              if (refreshAttempts < 3) {
                sessionStorage.setItem('connectionRefreshAttempts', String(refreshAttempts + 1))
                refreshTimeoutRef.current = setTimeout(() => {
                  window.location.reload()
                }, 1000)
              } else {
                console.error('Max refresh attempts reached. Please manually reconnect.')
                sessionStorage.removeItem('connectionRefreshAttempts')
              }
            } else if (isValid) {
              // Clear refresh attempts on successful connection
              sessionStorage.removeItem('connectionRefreshAttempts')
            }
          } catch (error) {
            console.error('Connection validation failed:', error)
            setIsValidConnection(false)
            onConnectionError?.(error as Error)
            
            // Auto-refresh on validation error (only once with limit)
            if (!isRefreshing) {
              console.log('Connection validation error. Auto-refreshing page once...')
              setIsRefreshing(true)
              
              const refreshAttempts = parseInt(sessionStorage.getItem('connectionRefreshAttempts') || '0')
              if (refreshAttempts < 3) {
                sessionStorage.setItem('connectionRefreshAttempts', String(refreshAttempts + 1))
                refreshTimeoutRef.current = setTimeout(() => {
                  window.location.reload()
                }, 1000)
              } else {
                console.error('Max refresh attempts reached. Please manually reconnect.')
                sessionStorage.removeItem('connectionRefreshAttempts')
              }
            }
          }
        }
      } else {
        // Reset the check flag when disconnected or modal is open
        hasCheckedRef.current = false
        // Clear refresh attempts when disconnected
        if (!isConnected) {
          sessionStorage.removeItem('connectionRefreshAttempts')
        }
      }
    }
    
    checkConnection()
  }, [isConnected, open, onConnectionError, isRefreshing, isValidConnection])
  
  // Show a brief loading state while refreshing
  if (isConnected && !isValidConnection) {
    return (
      <div className="connection-error" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <p>Refreshing connection...</p>
        <div style={{
          marginTop: '10px',
          fontSize: '24px',
          animation: 'spin 1s linear infinite'
        }}>⟳</div>
      </div>
    )
  }
  
  return <>{children}</>
}