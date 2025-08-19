import './App.css'
import { useState, useEffect, useRef } from 'react'
import { useDisconnect, useAppKit } from '@reown/appkit/react'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { V1ConnectionModal } from './components/V1ConnectionModal'
import { V2NamespaceModal } from './components/V2NamespaceModal'
import { ConfigurationModal } from './components/ConfigurationModal'
import { SessionMonitor } from './utils/sessionMonitor'
import { useDAppConnectorV1 } from './hooks/useDAppConnectorV1'
import { useV1Methods } from './hooks/useV1Methods'

export interface FunctionResult {
  functionName: string
  result: string
}

type ConnectionMode = 'none' | 'v1' | 'v2'

interface AppWithConfigProps {
  appKitConfig: any
}

export function AppWithConfig({ appKitConfig }: AppWithConfigProps) {
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
  const [showConfigModal, setShowConfigModal] = useState(false)
  const sessionMonitorRef = useRef<SessionMonitor | null>(null)

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

  // Initialize session monitor
  useEffect(() => {
    if (appKitConfig?.universalProvider) {
      sessionMonitorRef.current = new SessionMonitor(appKitConfig.universalProvider)
    }
  }, [appKitConfig])

  // Handle V2 connection with namespace selection
  const handleV2Connect = async (namespace: 'hedera' | 'eip155' | 'both') => {
    try {
      console.log('🔗 V2 Connection: User selected namespace:', namespace)

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
        requiredNamespaces:
          namespace === 'both'
            ? {
                hedera: {
                  methods: hederaMethods,
                  chains: ['hedera:testnet', 'hedera:mainnet'],
                  events: ['chainChanged', 'accountsChanged'],
                },
                eip155: {
                  methods: eip155Methods,
                  chains: ['eip155:296', 'eip155:295'],
                  events: ['chainChanged', 'accountsChanged'],
                },
              }
            : namespace === 'hedera'
              ? {
                  hedera: {
                    methods: hederaMethods,
                    chains: ['hedera:testnet', 'hedera:mainnet'],
                    events: ['chainChanged', 'accountsChanged'],
                  },
                }
              : {
                  eip155: {
                    methods: eip155Methods,
                    chains: ['eip155:296', 'eip155:295'],
                    events: ['chainChanged', 'accountsChanged'],
                  },
                },
      }

      // Store connection options for the modal to use
      sessionStorage.setItem('hwcV2ConnectionOptions', JSON.stringify(connectionOptions))

      console.log('📋 V2 Connection Options:', connectionOptions)
      console.log('🚀 Opening V2 modal with both adapters configured')

      // Open the modal with the appropriate network
      await open({
        view: 'Connect',
      })
    } catch (error) {
      console.error('V2 Connection error:', error)

      // Handle expired pairing URI specifically
      if (error instanceof Error) {
        if (error.message.includes('Expired') || error.message.includes('expired')) {
          console.warn('⚠️ Pairing URI expired, cleaning up old sessions...')

          // Clean up any invalid sessions
          await sessionMonitorRef.current?.cleanupInvalidSessions()

          // Clear stored connection options
          sessionStorage.removeItem('selectedHWCv2Namespace')
          sessionStorage.removeItem('hwcV2ConnectionOptions')

          // Inform user and suggest retry
          alert('The connection request expired. Please try connecting again.')
        } else if (
          error.message.includes('User rejected') ||
          error.message.includes('cancelled')
        ) {
          console.log('User cancelled connection')
          // User cancelled, no need to show error
        } else {
          // Other errors
          alert(`Connection failed: ${error.message}`)
        }
      }

      // Clear connection state
      clearState()
    }
  }

  // Check for existing V1 session on mount
  useEffect(() => {
    const checkV1Session = async () => {
      const v1SessionMarker = sessionStorage.getItem('hwcV1Session')
      if (v1SessionMarker && !v1Connection.connector) {
        console.log('Found V1 session marker, initializing V1 connector to restore session')
        await v1Connection.initializeConnector()
      }
    }
    checkV1Session()
  }, []) // Only on mount

  // Track connection mode - check v2 first since universalProvider might be shared
  useEffect(() => {
    // Check v2 connection first (universalProvider with namespaces)
    if (
      appKitConfig?.universalProvider?.session &&
      (appKitConfig.universalProvider.session.namespaces?.hedera ||
        appKitConfig.universalProvider.session.namespaces?.eip155)
    ) {
      // Log V2 connection details
      console.log('✅ V2 Connection Established:', {
        topic: appKitConfig.universalProvider.session.topic,
        peer: appKitConfig.universalProvider.session.peer,
        namespaces: appKitConfig.universalProvider.session.namespaces,
        requiredNamespaces: appKitConfig.universalProvider.session.requiredNamespaces,
        optionalNamespaces: appKitConfig.universalProvider.session.optionalNamespaces,
        sessionProperties: appKitConfig.universalProvider.session.sessionProperties,
        expiry: appKitConfig.universalProvider.session.expiry,
        acknowledged: appKitConfig.universalProvider.session.acknowledged,
        controller: appKitConfig.universalProvider.session.controller,
        self: appKitConfig.universalProvider.session.self,
      })

      // Log namespace details
      console.log('📦 V2 Namespaces Detail:', {
        hasHedera: !!appKitConfig.universalProvider.session.namespaces?.hedera,
        hasEip155: !!appKitConfig.universalProvider.session.namespaces?.eip155,
        hederaAccounts: appKitConfig.universalProvider.session.namespaces?.hedera?.accounts,
        hederaMethods: appKitConfig.universalProvider.session.namespaces?.hedera?.methods,
        hederaEvents: appKitConfig.universalProvider.session.namespaces?.hedera?.events,
        eip155Accounts: appKitConfig.universalProvider.session.namespaces?.eip155?.accounts,
        eip155Methods: appKitConfig.universalProvider.session.namespaces?.eip155?.methods,
        eip155Events: appKitConfig.universalProvider.session.namespaces?.eip155?.events,
      })

      // This is definitely a v2 connection
      setConnectionMode('v2')
    } else if (v1Connection.isConnected && v1Connection.session) {
      // This is a v1 connection
      setConnectionMode('v1')
    } else {
      setConnectionMode('none')
    }
  }, [v1Connection.isConnected, v1Connection.session, appKitConfig?.universalProvider?.session])

  // Add session validation effect for V2
  useEffect(() => {
    if (connectionMode !== 'v2' || !sessionMonitorRef.current) return

    const validateAndRecover = async () => {
      const isValid = await sessionMonitorRef.current!.validateSession()
      if (!isValid && appKitConfig?.universalProvider?.session) {
        console.warn('Invalid V2 session detected, cleaning up...')
        await sessionMonitorRef.current!.cleanupInvalidSessions()
        clearState()
      }
    }

    validateAndRecover()
    const interval = setInterval(validateAndRecover, 30000)

    return () => clearInterval(interval)
  }, [connectionMode, appKitConfig])

  // Enhanced disconnect handler
  const handleDisconnect = async () => {
    try {
      if (connectionMode === 'v1') {
        await v1Connection.disconnect()
      } else if (connectionMode === 'v2') {
        // Clear v2 namespace marker
        sessionStorage.removeItem('selectedHWCv2Namespace')
        sessionStorage.removeItem('hwcV2ConnectionOptions')

        // Always try to disconnect if there's a session
        if (appKitConfig?.universalProvider?.session) {
          await disconnectV2()
          // Clear the session from the universal provider
          if (appKitConfig.universalProvider.session) {
            await appKitConfig.universalProvider.disconnect()
          }
        }

        // Clean up any invalid sessions
        if (sessionMonitorRef.current) {
          await sessionMonitorRef.current.cleanupInvalidSessions()
        }
      }

      clearState()
      setConnectionMode('none')
    } catch (error) {
      console.error('Disconnect error:', error)
      if (connectionMode === 'v2' && sessionMonitorRef.current) {
        await sessionMonitorRef.current.cleanupInvalidSessions()
      }
      clearState()
      setConnectionMode('none')
    }
  }

  // V2 session events
  useEffect(() => {
    if (connectionMode !== 'v2' || !appKitConfig?.universalProvider) return

    appKitConfig.universalProvider.on('session_delete', handleDisconnect)
    appKitConfig.universalProvider.client.core?.pairing.events?.on(
      'pairing_delete',
      handleDisconnect as (event: unknown) => void,
    )

    return () => {
      appKitConfig.universalProvider.off('session_delete', handleDisconnect)
      appKitConfig.universalProvider.client.core?.pairing.events?.off(
        'pairing_delete',
        handleDisconnect as (event: unknown) => void,
      )
    }
  }, [disconnectV2, connectionMode, appKitConfig])

  // Error boundary for session errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Cannot read properties of undefined')) {
        console.error('WalletConnect internal error detected')
        if (connectionMode === 'v2' && sessionMonitorRef.current) {
          sessionMonitorRef.current.cleanupInvalidSessions()
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
      const hexSignature =
        typeof signature === 'string'
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
    if (!appKitConfig?.universalProvider?.session) return null
    const namespaces = appKitConfig.universalProvider.session.namespaces
    if (namespaces?.hedera && namespaces?.eip155) return 'both'
    if (namespaces?.hedera) return 'hedera'
    if (namespaces?.eip155) return 'eip155'
    return null
  }

  return (
    <ConnectionWrapper
      onConnectionError={(error) => {
        console.error('Connection error detected:', error)
        if (connectionMode === 'v2' && sessionMonitorRef.current) {
          sessionMonitorRef.current.cleanupInvalidSessions()
        }
        clearState()
      }}
      universalProvider={appKitConfig?.universalProvider}
    >
      <div className="pages">
        <div className="logos">
          <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
          <img src="/hedera.svg" alt="Hedera" style={{ width: '90px', height: '90px' }} />
        </div>
        <h1>Hedera App with HWC v1 & v2 Support</h1>

        {/* Connection Status */}
        <div
          className="connection-status"
          style={{
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: connectionMode !== 'none' ? '#e8f5e9' : '#f5f5f5',
            border: `1px solid ${connectionMode !== 'none' ? '#4caf50' : '#ddd'}`,
          }}
        >
          {connectionMode === 'none' && <p>Not connected. Choose a connection method below.</p>}
          {connectionMode === 'v1' && (
            <p>
              <strong>Connected via HWC v1</strong>
              <br />
              Account: {v1Connection.accountId}
            </p>
          )}
          {connectionMode === 'v2' && (
            <p>
              <strong>
                Connected via HWC v2 ({getCurrentV2Namespace() || 'unknown'} namespace)
              </strong>
              {appKitConfig?.universalProvider?.session?.namespaces?.hedera && (
                <>
                  <br />
                  Hedera Account:{' '}
                  {appKitConfig.universalProvider.session.namespaces.hedera.accounts[0]}
                </>
              )}
              {appKitConfig?.universalProvider?.session?.namespaces?.eip155 && (
                <>
                  <br />
                  EIP-155 Account:{' '}
                  {appKitConfig.universalProvider.session.namespaces.eip155.accounts[0]}
                </>
              )}
            </p>
          )}
        </div>

        {/* Connection Buttons */}
        {connectionMode === 'none' && (
          <div
            className="connection-options"
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
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
          <div
            className="v1-actions"
            style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
            }}
          >
            <h3>V1 Actions</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleV1Transfer}>Transfer HBAR</button>
              <button onClick={handleV1SignMessage}>Sign Message</button>
              <button onClick={handleV1Balance}>Get Balance</button>
              <button
                onClick={handleDisconnect}
                style={{ backgroundColor: '#f44336', color: 'white' }}
              >
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
            onDisconnect={() => {
              clearState()
              setConnectionMode('none')
            }}
            jsonRpcProvider={appKitConfig?.jsonRpcProvider}
          />
        )}

        <div className="advice">
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p>Current configuration:</p>
            <p>• Project ID: {appKitConfig?.projectId?.substring(0, 8)}...</p>
            <p>• RPC URL: {appKitConfig?.rpcUrl}</p>
            <button
              onClick={() => setShowConfigModal(true)}
              style={{
                marginTop: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Update Configuration
            </button>
          </div>
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
          onConnect={async (extensionData) => {
            // Initialize V1 connector only when user attempts to connect
            if (!v1Connection.connector) {
              await v1Connection.initializeConnector()
            }
            return v1Connection.connect(extensionData)
          }}
          availableExtensions={v1Connection.getAvailableExtensions()}
          isDetectingExtensions={v1Connection.isDetectingExtensions}
          onRefreshExtensions={v1Connection.refreshExtensionDetection}
        />

        {/* V2 Namespace Selection Modal */}
        <V2NamespaceModal
          isOpen={showV2NamespaceModal}
          onClose={() => setShowV2NamespaceModal(false)}
          onConnect={handleV2Connect}
        />

        {/* Configuration Modal */}
        <ConfigurationModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSave={(newProjectId, newRpcUrl) => {
            // Save new configuration and reload to apply changes
            localStorage.setItem('reownProjectId', newProjectId)
            localStorage.setItem('hederaRpcUrl', newRpcUrl)
            window.location.reload()
          }}
          currentProjectId={appKitConfig?.projectId}
          currentRpcUrl={appKitConfig?.rpcUrl}
        />
      </div>
    </ConnectionWrapper>
  )
}

export default AppWithConfig
