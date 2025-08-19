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
import './utils/debug'
import { createDynamicConfig, metadata, networks } from './config/dynamicConfig'
import { HederaChainDefinition } from '@hashgraph/hedera-wallet-connect'
import UniversalProvider from '@walletconnect/universal-provider'

export interface FunctionResult {
  functionName: string
  result: string
}

type ConnectionMode = 'none' | 'v1' | 'v2'

export function AppDynamic() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [universalProvider, setUniversalProvider] = useState<UniversalProvider | null>(null)
  const [jsonRpcProvider, setJsonRpcProvider] = useState<any>(null)

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
  const sessionMonitor = useRef<SessionMonitor | null>(null)

  // V1 connection state
  const v1Connection = useDAppConnectorV1()
  const v1Methods = useV1Methods({
    signers: v1Connection.signers,
    accountId: v1Connection.accountId,
    connector: v1Connection.connector,
  })

  // Check for saved configuration on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem('reownProjectId')
    const savedRpcUrl = localStorage.getItem('hederaRpcUrl')

    if (savedProjectId) {
      // Auto-configure if we have saved values
      handleConfiguration(
        savedProjectId,
        savedRpcUrl || 'https://testnet.hedera.api.hgraph.io/v1/pk_test/rpc',
      )
    } else {
      // Show config modal on first load
      setShowConfigModal(true)
    }
  }, [])

  const handleConfiguration = async (projectId: string, rpcUrl: string) => {
    try {
      const config = await createDynamicConfig(projectId, rpcUrl)
      setUniversalProvider(config.universalProvider)
      setJsonRpcProvider(config.jsonRpcProvider)
      sessionMonitor.current = new SessionMonitor(config.universalProvider)
      setIsConfigured(true)

      console.log('✅ Configuration complete:', {
        projectId,
        rpcUrl,
        provider: config.universalProvider,
      })
    } catch (error) {
      console.error('Configuration failed:', error)
      alert('Failed to configure. Please check your Project ID and try again.')
    }
  }

  const clearState = () => {
    setTransactionHash('')
    setTransactionId('')
    setSignedMsg('')
    setNodes([])
    setLastFunctionResult(null)
  }

  // Handle V2 connection with namespace selection
  const handleV2Connect = async (namespace: 'hedera' | 'eip155' | 'both') => {
    if (!isConfigured) {
      alert('Please configure Project ID first')
      setShowConfigModal(true)
      return
    }

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
      clearState()
    }
  }

  // Track connection mode - check v2 first since universalProvider might be shared
  useEffect(() => {
    if (!universalProvider) return

    // Check v2 connection first (universalProvider with namespaces)
    if (
      universalProvider.session &&
      (universalProvider.session.namespaces?.hedera ||
        universalProvider.session.namespaces?.eip155)
    ) {
      setConnectionMode('v2')
    } else if (v1Connection.connector && v1Connection.signers.length > 0) {
      setConnectionMode('v1')
    } else {
      setConnectionMode('none')
    }
  }, [universalProvider?.session, v1Connection.connector, v1Connection.signers])

  // Enhanced disconnect handler
  const handleDisconnect = async () => {
    try {
      if (connectionMode === 'v1') {
        await v1Connection.disconnect()
      } else if (connectionMode === 'v2' && universalProvider) {
        sessionStorage.removeItem('selectedHWCv2Namespace')
        sessionStorage.removeItem('hwcV2ConnectionOptions')

        if (universalProvider.session) {
          await disconnectV2()
          if (universalProvider.session) {
            await universalProvider.disconnect()
          }
        }

        await sessionMonitor.current?.cleanupInvalidSessions()
      }

      clearState()
      setConnectionMode('none')
    } catch (error) {
      console.error('Disconnect error:', error)
      clearState()
      setConnectionMode('none')
    }
  }

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
      const balance = await v1Methods.getBalance()
      setLastFunctionResult({
        functionName: 'V1 Get Balance',
        result: `${balance.hbars.toString()} (${balance.tokens?.toString() || '0'} tokens)`,
      })
    } catch (error) {
      console.error('V1 Balance failed:', error)
      setLastFunctionResult({
        functionName: 'V1 Get Balance',
        result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      })
    }
  }

  if (!isConfigured) {
    return (
      <>
        <ConnectionWrapper>
          <div className="walletconnect">
            <h2>Welcome to Hedera DApp Example</h2>
            <p>Please configure your Project ID to get started</p>
            <button onClick={() => setShowConfigModal(true)}>Configure</button>
          </div>
        </ConnectionWrapper>

        <ConfigurationModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSave={handleConfiguration}
        />
      </>
    )
  }

  return (
    <>
      <ConnectionWrapper>
        <div className="walletconnect">
          {/* Connection buttons */}
          {connectionMode === 'none' && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setShowV1Modal(true)}>Connect V1</button>
              <button onClick={() => setShowV2NamespaceModal(true)}>Connect V2</button>
              <button
                onClick={() => setShowConfigModal(true)}
                style={{ marginLeft: 'auto', backgroundColor: '#666' }}
              >
                ⚙️ Config
              </button>
            </div>
          )}

          {/* V1 actions */}
          {connectionMode === 'v1' && (
            <div>
              <h3>V1 Connected</h3>
              <p>Account: {v1Connection.accountId}</p>
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
            />
          )}

          <div className="advice">
            <button
              onClick={() => setShowConfigModal(true)}
              style={{ fontSize: '12px', padding: '5px 10px' }}
            >
              Change Configuration
            </button>
          </div>
        </div>

        {/* Info display */}
        <InfoList
          hederaTxId={transactionId}
          ethTxHash={transactionHash}
          signedMessage={signedMsg}
          nodeAddresses={nodes}
          functionResult={lastFunctionResult}
        />
      </ConnectionWrapper>

      {/* Modals */}
      <V1ConnectionModal
        isOpen={showV1Modal}
        onClose={() => setShowV1Modal(false)}
        onConnect={async () => {
          await v1Connection.initializeConnector()
          setShowV1Modal(false)
        }}
      />

      <V2NamespaceModal
        isOpen={showV2NamespaceModal}
        onClose={() => setShowV2NamespaceModal(false)}
        onConnect={handleV2Connect}
      />

      <ConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfiguration}
      />
    </>
  )
}
