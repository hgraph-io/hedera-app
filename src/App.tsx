import './App.css'
import { useState, useEffect, useRef } from 'react'
import { createAppKit, useDisconnect, useAppKit } from '@reown/appkit/react'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { V1ConnectionModal } from './components/V1ConnectionModal'
import { V2NamespaceModal } from './components/V2NamespaceModal'
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
import { HederaChainDefinition } from '@hashgraph/hedera-wallet-connect'

// Create modal for V2 with both adapters
createAppKit({
  adapters: [nativeHederaAdapter, eip155HederaAdapter],
  universalProvider,
  defaultNetwork: HederaChainDefinition.Native.Testnet,
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

export function App() {
  const { disconnect: disconnectV2 } = useDisconnect()
  const { open } = useAppKit()
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [signedMsg, setSignedMsg] = useState('')
  const [nodes, setNodes] = useState<string[]>([])
  const [lastFunctionResult, setLastFunctionResult] = useState<FunctionResult | null>(null)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('none')
  const [showV1Modal, setShowV1Modal] = useState(false)
  const [showV2NamespaceModal, setShowV2NamespaceModal] = useState(false)
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

  // Handle V2 connection with namespace selection
  const handleV2Connect = async (namespace: 'hedera' | 'eip155' | 'both') => {
    // Store the selected namespace in session storage for reference
    sessionStorage.setItem('selectedHWCv2Namespace', namespace)
    
    // Configure the connection options based on namespace selection
    const hederaMethods = [
      'hedera_getAccountBalance',
      'hedera_getAccountInfo', 
      'hedera_getTransactionReceipt',
      'hedera_executeTransaction',
      'hedera_signMessage',
      'hedera_signTransaction',
      'hedera_signAndExecuteTransaction',
      'hedera_signAndExecuteQuery',
    ]
    
    const eip155Methods = [
      'eth_sendTransaction',
      'eth_signTransaction',
      'eth_sign',
      'personal_sign',
      'eth_signTypedData',
      'eth_signTypedData_v4',
      'eth_accounts',
      'eth_chainId',
    ]
    
    const connectionOptions = {
      requiredNamespaces: namespace === 'both' ? {
        hedera: {
          methods: hederaMethods,
          chains: ['hedera:testnet', 'hedera:mainnet'],
          events: ['chainChanged', 'accountsChanged'],
        },
        eip155: {
          methods: eip155Methods,
          chains: ['eip155:296', 'eip155:295'],
          events: ['chainChanged', 'accountsChanged'],
        }
      } : namespace === 'hedera' ? {
        hedera: {
          methods: hederaMethods,
          chains: ['hedera:testnet', 'hedera:mainnet'],
          events: ['chainChanged', 'accountsChanged'],
        }
      } : {
        eip155: {
          methods: eip155Methods,
          chains: ['eip155:296', 'eip155:295'],
          events: ['chainChanged', 'accountsChanged'],
        }
      }
    }
    
    // Store connection options for the modal to use
    sessionStorage.setItem('hwcV2ConnectionOptions', JSON.stringify(connectionOptions))
    
    // Open the modal with the appropriate network
    await open({
      view: 'Connect'
    })
  }

  // Track connection mode - check v2 first since universalProvider might be shared
  useEffect(() => {
    // Debug logging
    console.log('Connection mode detection:', {
      v1Connected: v1Connection.isConnected,
      v1Session: v1Connection.session,
      v2Session: universalProvider.session,
      v2Namespaces: universalProvider.session?.namespaces,
    })
    
    // Check v2 connection first (universalProvider with namespaces)
    if (universalProvider.session && 
        (universalProvider.session.namespaces?.hedera || 
         universalProvider.session.namespaces?.eip155)) {
      // This is definitely a v2 connection
      setConnectionMode('v2')
    } else if (v1Connection.isConnected && v1Connection.session) {
      // This is a v1 connection
      setConnectionMode('v1')
    } else {
      setConnectionMode('none')
    }
  }, [v1Connection.isConnected, v1Connection.session, universalProvider.session])

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
        // Clear v2 namespace marker
        sessionStorage.removeItem('selectedHWCv2Namespace')
        sessionStorage.removeItem('hwcV2ConnectionOptions')
        
        const isValid = await sessionMonitor.current.validateSession()
        
        if (!isValid) {
          await sessionMonitor.current.cleanupInvalidSessions()
        } else if (universalProvider.session?.namespaces?.eip155 || universalProvider.session?.namespaces?.hedera) {
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

  // Get current namespace for V2
  const getCurrentV2Namespace = () => {
    if (!universalProvider.session) return null
    const namespaces = universalProvider.session.namespaces
    if (namespaces?.hedera && namespaces?.eip155) return 'both'
    if (namespaces?.hedera) return 'hedera'
    if (namespaces?.eip155) return 'eip155'
    return null
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
              <strong>Connected via HWC v2 ({getCurrentV2Namespace() || 'unknown'} namespace)</strong>
              {universalProvider.session?.namespaces?.hedera && (
                <><br />Hedera Account: {universalProvider.session.namespaces.hedera.accounts[0]}</>
              )}
              {universalProvider.session?.namespaces?.eip155 && (
                <><br />EIP-155 Account: {universalProvider.session.namespaces.eip155.accounts[0]}</>
              )}
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
            <button
              onClick={() => setShowV2NamespaceModal(true)}
              className="connect-v2-button"
              style={{
                padding: '10px 20px',
                backgroundColor: '#7B3FF2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Connect with HWC v2
            </button>
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

        {/* V2 Namespace Selection Modal */}
        <V2NamespaceModal
          isOpen={showV2NamespaceModal}
          onClose={() => setShowV2NamespaceModal(false)}
          onConnect={handleV2Connect}
        />
      </div>
    </ConnectionWrapper>
  )
}

export default App