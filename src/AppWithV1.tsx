import './App.css'
import { useState, useEffect, useRef } from 'react'
import { createAppKit, useDisconnect } from '@reown/appkit/react'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { V1ConnectionModal } from './components/V1ConnectionModal'
import { SessionMonitor } from './utils/sessionMonitor'
import { useDAppConnectorV1 } from './hooks/useDAppConnectorV1'
import { useV1Methods } from './hooks/useV1Methods'
import './utils/debug'
import {
  projectId,
  metadata,
  networks,
  nativeHederaAdapter,
  eip155HederaAdapter,
  universalProvider,
} from './config'
import { DEFAULT_TESTNET_NETWORK } from './config/networkConfig'

// Create modal for V2
createAppKit({
  adapters: [nativeHederaAdapter, eip155HederaAdapter],
  universalProvider,
  defaultNetwork: DEFAULT_TESTNET_NETWORK, // Use Testnet as default
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
  // Ensure testnet is selected on initial connect
  chainImages: {
    'hedera:testnet': '/hedera.svg',
    'hedera:mainnet': '/hedera.svg',
    'eip155:296': '/hedera.svg',
    'eip155:295': '/hedera.svg',
  },
})

export interface FunctionResult {
  functionName: string
  result: string
}

type ConnectionMode = 'none' | 'v1' | 'v2'

export function AppWithV1() {
  const { disconnect: disconnectV2 } = useDisconnect()
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [signedMsg, setSignedMsg] = useState('')
  const [nodes, setNodes] = useState<string[]>([])
  const [lastFunctionResult, setLastFunctionResult] = useState<FunctionResult | null>(null)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('none')
  const [showV1Modal, setShowV1Modal] = useState(false)
  const sessionMonitor = useRef(new SessionMonitor(universalProvider))

  // V1 connection state
  const v1Connection = useDAppConnectorV1()
  const v1Methods = useV1Methods({
    signers: v1Connection.signers,
    accountId: v1Connection.accountId,
    connector: v1Connection.connector,
  })

  const clearState = () => {
    setTransactionHash('')
    setTransactionId('')
    setSignedMsg('')
    setNodes([])
    setLastFunctionResult(null)
  }

  // Track connection mode
  useEffect(() => {
    if (v1Connection.isConnected) {
      setConnectionMode('v1')
    } else if (universalProvider.session) {
      setConnectionMode('v2')
    } else {
      setConnectionMode('none')
    }
  }, [v1Connection.isConnected, universalProvider.session])

  // Add session validation effect for V2
  useEffect(() => {
    if (connectionMode !== 'v2') return

    const validateAndRecover = async () => {
      const isValid = await sessionMonitor.current.validateSession()
      if (!isValid && universalProvider.session) {
        console.warn('Invalid V2 session detected, cleaning up...')
        await sessionMonitor.current.cleanupInvalidSessions()
        clearState()
      }
    }
    
    validateAndRecover()
    const interval = setInterval(validateAndRecover, 30000)
    
    return () => clearInterval(interval)
  }, [connectionMode])

  // Enhanced disconnect handler
  const handleDisconnect = async () => {
    try {
      if (connectionMode === 'v1') {
        await v1Connection.disconnect()
      } else if (connectionMode === 'v2') {
        const isValid = await sessionMonitor.current.validateSession()
        
        if (!isValid) {
          await sessionMonitor.current.cleanupInvalidSessions()
        } else if (universalProvider.session?.namespaces?.eip155) {
          await disconnectV2()
        }
      }
      
      clearState()
      setConnectionMode('none')
    } catch (error) {
      console.error('Disconnect error:', error)
      if (connectionMode === 'v2') {
        await sessionMonitor.current.cleanupInvalidSessions()
      }
      clearState()
      setConnectionMode('none')
    }
  }

  // V2 session events
  useEffect(() => {
    if (connectionMode !== 'v2') return

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
  }, [disconnectV2, connectionMode])

  // Error boundary for session errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Cannot read properties of undefined')) {
        console.error('WalletConnect internal error detected')
        if (connectionMode === 'v2') {
          sessionMonitor.current.cleanupInvalidSessions()
        }
        clearState()
      }
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [connectionMode])

  // V1 method handlers
  const handleV1Transfer = async () => {
    try {
      const result = await v1Methods.transferHBAR()
      setTransactionId(result.transactionId)
      setLastFunctionResult({
        functionName: 'V1 Transfer HBAR',
        result: `Status: ${result.status}`,
      })
    } catch (error) {
      console.error('V1 Transfer failed:', error)
      setLastFunctionResult({
        functionName: 'V1 Transfer HBAR',
        result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      })
    }
  }

  const handleV1SignMessage = async () => {
    try {
      const message = 'Hello from V1 - ' + new Date().toISOString()
      const signature = await v1Methods.signMessage(message)
      // Convert signature to hex string
      const hexSignature = typeof signature === 'string' 
        ? signature 
        : (signature as any).signature || JSON.stringify(signature)
      setSignedMsg(hexSignature)
      setLastFunctionResult({
        functionName: 'V1 Sign Message',
        result: 'Message signed successfully',
      })
    } catch (error) {
      console.error('V1 Sign failed:', error)
      setLastFunctionResult({
        functionName: 'V1 Sign Message',
        result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      })
    }
  }

  const handleV1Balance = async () => {
    try {
      const balance = await v1Methods.getAccountBalance()
      setLastFunctionResult({
        functionName: 'V1 Account Balance',
        result: `${balance.hbars} (${balance.tokens.length} tokens)`,
      })
    } catch (error) {
      console.error('V1 Balance query failed:', error)
      setLastFunctionResult({
        functionName: 'V1 Account Balance',
        result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      })
    }
  }

  return (
    <ConnectionWrapper onConnectionError={(error) => {
      console.error('Connection error detected:', error)
      if (connectionMode === 'v2') {
        sessionMonitor.current.cleanupInvalidSessions()
      }
      clearState()
    }}>
      <div className="pages">
        <div className="logos">
          <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
          <img src="/hedera.svg" alt="Hedera" style={{ width: '90px', height: '90px' }} />
        </div>
        <h1>Hedera App with WalletConnect v1 & v2 Support</h1>
        
        {/* Connection Status */}
        <div className="connection-status" style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: connectionMode !== 'none' ? '#e8f5e9' : '#f5f5f5',
          border: `1px solid ${connectionMode !== 'none' ? '#4caf50' : '#ddd'}`,
        }}>
          {connectionMode === 'none' && (
            <p>Not connected. Choose a connection method below.</p>
          )}
          {connectionMode === 'v1' && (
            <p>
              <strong>Connected via HWC v1</strong><br />
              Account: {v1Connection.accountId}
            </p>
          )}
          {connectionMode === 'v2' && (
            <p>
              <strong>Connected via HWC v2</strong>
            </p>
          )}
        </div>

        {/* Connection Buttons */}
        {connectionMode === 'none' && (
          <div className="connection-options" style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <button
              onClick={() => setShowV1Modal(true)}
              className="connect-v1-button"
              style={{
                padding: '10px 20px',
                backgroundColor: '#00897b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Connect with HWC v1
            </button>
            <w3m-button label="Connect with HWC v2" />
          </div>
        )}

        {/* V1-specific actions */}
        {connectionMode === 'v1' && (
          <div className="v1-actions" style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
          }}>
            <h3>V1 Actions</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleV1Transfer}>Transfer HBAR</button>
              <button onClick={handleV1SignMessage}>Sign Message</button>
              <button onClick={handleV1Balance}>Get Balance</button>
              <button onClick={handleDisconnect} style={{ backgroundColor: '#f44336', color: 'white' }}>
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* V2 actions */}
        {connectionMode === 'v2' && (
          <ActionButtonList
            sendHash={setTransactionHash}
            ethTxHash={transactionHash}
            sendTxId={setTransactionId}
            sendSignMsg={setSignedMsg}
            sendNodeAddresses={setNodes}
            setLastFunctionResult={setLastFunctionResult}
            onDisconnect={clearState}
          />
        )}

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

        {/* V1 Connection Modal */}
        <V1ConnectionModal
          isOpen={showV1Modal}
          onClose={() => setShowV1Modal(false)}
          onConnect={v1Connection.connect}
          availableExtensions={v1Connection.getAvailableExtensions()}
        />
      </div>
    </ConnectionWrapper>
  )
}

export default AppWithV1