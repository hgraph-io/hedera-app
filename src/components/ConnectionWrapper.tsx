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
          }) as string[]
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