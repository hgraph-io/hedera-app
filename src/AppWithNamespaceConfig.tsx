import './App.css'
import { useState, useEffect, useRef } from 'react'
import { createAppKit, useDisconnect, useAppKit } from '@reown/appkit/react'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { V1ConnectionModal } from './components/V1ConnectionModal'
import { SessionMonitor } from './utils/sessionMonitor'
import { useDAppConnectorV1 } from './hooks/useDAppConnectorV1'
import { useV1Methods } from './hooks/useV1Methods'
import './utils/debug'
import { projectId, metadata, networks, universalProvider } from './config'
import {
  HederaChainDefinition,
  HederaAdapter,
  hederaNamespace,
} from '@hashgraph/hedera-wallet-connect'

export interface FunctionResult {
  functionName: string
  result: string
}

type ConnectionMode = 'none' | 'v1' | 'v2'

// Test configurations for different namespace modes
const TestConfigs = {
  hederaRequired: {
    adapters: [
      new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
        namespace: hederaNamespace,
        namespaceMode: 'required',
      }),
    ],
    description: 'Hedera namespace with required mode',
  },
  hederaOptional: {
    adapters: [
      new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
        namespace: hederaNamespace,
        namespaceMode: 'optional',
      }),
    ],
    description: 'Hedera namespace with optional mode',
  },
  eip155Required: {
    adapters: [
      new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
        namespace: 'eip155',
        namespaceMode: 'required',
      }),
    ],
    description: 'EIP-155 namespace with required mode',
  },
  bothOptional: {
    adapters: [
      new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
        namespace: hederaNamespace,
        namespaceMode: 'optional',
      }),
      new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
        namespace: 'eip155',
        namespaceMode: 'optional',
      }),
    ],
    description: 'Both namespaces with optional mode',
  },
  bothRequired: {
    adapters: [
      new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
        namespace: hederaNamespace,
        namespaceMode: 'required',
      }),
      new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
        namespace: 'eip155',
        namespaceMode: 'required',
      }),
    ],
    description: 'Both namespaces with required mode',
  },
}

export function AppWithNamespaceConfig() {
  const [selectedConfig, setSelectedConfig] =
    useState<keyof typeof TestConfigs>('hederaRequired')
  const [modalCreated, setModalCreated] = useState(false)
  const { disconnect: disconnectV2 } = useDisconnect()
  const { open } = useAppKit()
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

  // Create modal with selected configuration
  useEffect(() => {
    if (!modalCreated) {
      const config = TestConfigs[selectedConfig]
      createAppKit({
        adapters: config.adapters,
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
      setModalCreated(true)
    }
  }, [selectedConfig, modalCreated])

  const clearState = () => {
    setTransactionHash('')
    setTransactionId('')
    setSignedMsg('')
    setNodes([])
    setLastFunctionResult(null)
  }

  // Track connection mode
  useEffect(() => {
    if (
      universalProvider.session &&
      (universalProvider.session.namespaces?.hedera ||
        universalProvider.session.namespaces?.eip155)
    ) {
      setConnectionMode('v2')
    } else if (v1Connection.isConnected && v1Connection.session) {
      setConnectionMode('v1')
    } else {
      setConnectionMode('none')
    }
  }, [v1Connection.isConnected, v1Connection.session, universalProvider.session])

  // Get current namespace for V2
  const getCurrentV2Namespace = () => {
    if (!universalProvider.session) return null
    const namespaces = universalProvider.session.namespaces
    if (namespaces?.hedera && namespaces?.eip155) return 'both'
    if (namespaces?.hedera) return 'hedera'
    if (namespaces?.eip155) return 'eip155'
    return null
  }

  const handleDisconnect = async () => {
    try {
      if (connectionMode === 'v1') {
        await v1Connection.disconnect()
      } else if (connectionMode === 'v2') {
        await disconnectV2()
      }
      clearState()
      setConnectionMode('none')
    } catch (error) {
      console.error('Disconnect error:', error)
      clearState()
      setConnectionMode('none')
    }
  }

  return (
    <ConnectionWrapper
      onConnectionError={(error) => {
        console.error('Connection error detected:', error)
        clearState()
      }}
    >
      <div className="pages">
        <div className="logos">
          <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
          <img src="/hedera.svg" alt="Hedera" style={{ width: '90px', height: '90px' }} />
        </div>
        <h1>Testing Namespace Configurations for HashPack</h1>

        {/* Configuration Selector */}
        {connectionMode === 'none' && !modalCreated && (
          <div
            style={{
              padding: '20px',
              marginBottom: '20px',
              borderRadius: '8px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
            }}
          >
            <h3>Select Configuration to Test:</h3>
            <select
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value as keyof typeof TestConfigs)}
              style={{
                padding: '10px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                width: '100%',
                marginBottom: '10px',
              }}
            >
              {Object.entries(TestConfigs).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.description}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Selected: {TestConfigs[selectedConfig].description}
            </p>
          </div>
        )}

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
          {connectionMode === 'none' && (
            <p>Not connected. Configuration: {TestConfigs[selectedConfig].description}</p>
          )}
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
              {universalProvider.session?.namespaces?.hedera && (
                <>
                  <br />
                  Hedera Account: {universalProvider.session.namespaces.hedera.accounts[0]}
                </>
              )}
              {universalProvider.session?.namespaces?.eip155 && (
                <>
                  <br />
                  EIP-155 Account: {universalProvider.session.namespaces.eip155.accounts[0]}
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
            {modalCreated && <w3m-button label="Connect with HWC v2" />}
          </div>
        )}

        {/* Actions */}
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
            <button
              onClick={handleDisconnect}
              style={{ backgroundColor: '#f44336', color: 'white' }}
            >
              Disconnect
            </button>
          </div>
        )}

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

export default AppWithNamespaceConfig
