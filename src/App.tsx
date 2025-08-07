import './App.css'
import { useState, useEffect, useRef } from 'react'
import { hederaTestnet } from '@reown/appkit/networks'
import { createAppKit, useDisconnect } from '@reown/appkit/react'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { SessionMonitor } from './utils/sessionMonitor'
import './utils/debug' // Import debug utilities
import {
  projectId,
  metadata,
  networks,
  nativeHederaAdapter,
  eip155HederaAdapter,
  universalProvider,
} from './config'

// Create modal
createAppKit({
  adapters: [nativeHederaAdapter, eip155HederaAdapter],
  universalProvider,
  defaultNetwork: hederaTestnet,
  projectId,
  metadata,
  networks,
  themeMode: 'light' as const,
  enableReconnect: true,
  features: {
    analytics: true,
    socials: false,
    swaps: false,
    onramp: false,
    email: false,
  },
})

export interface FunctionResult {
  functionName: string
  result: string
}

export function App() {
  const { disconnect } = useDisconnect()
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [signedMsg, setSignedMsg] = useState('')
  const [nodes, setNodes] = useState<string[]>([])
  const [lastFunctionResult, setLastFunctionResult] = useState<FunctionResult | null>(null)
  const sessionMonitor = useRef(new SessionMonitor(universalProvider))

  const clearState = () => {
    setTransactionHash('')
    setTransactionId('')
    setSignedMsg('')
    setNodes([])
    setLastFunctionResult(null)
  }

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

  useEffect(() => {
    universalProvider.on('session_delete', handleDisconnect)
    universalProvider.client.core?.pairing.events?.on(
      'pairing_delete',
      handleDisconnect as (event: unknown) => void,
    )

    return () => {
      universalProvider.off('session_delete', handleDisconnect)
      universalProvider.client.core?.pairing.events?.off(
        'pairing_delete',
        handleDisconnect as (event: unknown) => void,
      )
    }
  }, [disconnect])

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

  return (
    <ConnectionWrapper onConnectionError={(error) => {
      console.error('Connection error detected:', error)
      sessionMonitor.current.cleanupInvalidSessions()
      clearState()
    }}>
      <div className="pages">
        <div className="logos">
          <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
          <img src="/hedera.svg" alt="Hedera" style={{ width: '90px', height: '90px' }} />
        </div>
        <h1>Hedera App Example using Reown AppKit and Hedera</h1>
        <ActionButtonList
          sendHash={setTransactionHash}
          ethTxHash={transactionHash}
          sendTxId={setTransactionId}
          sendSignMsg={setSignedMsg}
          sendNodeAddresses={setNodes}
          setLastFunctionResult={setLastFunctionResult}
          onDisconnect={clearState}
        />
        <div className="advice">
          <p>
            Go to{' '}
            <a
              href="https://cloud.reown.com"
              target="_blank"
              className="link-button"
              rel="Reown Cloud"
            >
              Reown Cloud
            </a>{' '}
            to get projectId.
          </p>
        </div>
        <InfoList
          hash={transactionHash}
          txId={transactionId}
          signedMsg={signedMsg}
          nodes={nodes}
          lastFunctionResult={lastFunctionResult}
        />
      </div>
    </ConnectionWrapper>
  )
}

export default App
