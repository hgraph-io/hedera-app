import './App.css'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  createAppKit,
  useDisconnect,
  useAppKit,
  // useAppKitState,
  useAppKitAccount,
  useAppKitEvents,
} from '@reown/appkit/react'
import {
  HederaChainDefinition,
  HederaProvider,
  HederaAdapter,
  hederaNamespace,
} from '@hashgraph/hedera-wallet-connect'
import { JsonRpcProvider } from 'ethers'
import { metadata, networks, DEFAULT_RPC_URL } from './config'
// import { ActionButtonList } from './components/ActionButtonList'
// import { InfoList } from './components/InfoList'
// import { V2NamespaceModal } from './components/V2NamespaceModal'
import { ConfigurationModal } from './components/ConfigurationModal'
import { InitialConfigForm } from './components/InitialConfigForm'
import { useHederaMethods } from './hooks/useHederaMethods'
import { useEthereumMethods } from './hooks/useEthereumMethods'

export interface FunctionResult {
  functionName: string
  result: string
}

// Main V2App component that handles configuration
export function V2App() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [appKitConfig, setAppKitConfig] = useState<any>(null)

  // Check for existing configuration on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem('reownProjectId')
    const savedRpcUrl = localStorage.getItem('hederaRpcUrl') || DEFAULT_RPC_URL

    if (savedProjectId) {
      handleConfigSubmit(savedProjectId, savedRpcUrl)
    }
  }, [])

  const handleConfigSubmit = async (projectId: string, rpcUrl: string) => {
    // Create JSON RPC provider
    const jsonRpcProvider = new JsonRpcProvider(rpcUrl)

    // Create adapters
    const nativeHederaAdapter = new HederaAdapter({
      projectId,
      networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
      namespace: hederaNamespace, // 'hedera' as ChainNamespace
    })

    const eip155HederaAdapter = new HederaAdapter({
      projectId,
      networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
      namespace: 'eip155',
    })

    const providerOpts = {
      projectId,
      metadata,
      logger: 'error' as const,
      optionalNamespaces: {
        // hashpack only uses the first namespace in the list
        eip155: {
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
            'eth_signTypedData_v4',
            'eth_accounts',
            'eth_chainId',
          ],
          chains: ['eip155:295', 'eip155:296'], // Hashpack only uses the first chain in the list
          events: ['chainChanged', 'accountsChanged'],
        },
        hedera: {
          methods: [
            'hedera_getNodeAddresses',
            'hedera_executeTransaction',
            'hedera_signMessage',
            'hedera_signAndExecuteQuery',
            'hedera_signAndExecuteTransaction',
            'hedera_signTransaction',
          ],
          chains: ['hedera:mainnet'], // Hashpack only uses the first chain in the list, also this seems to dictate testnet vs mainnet for EIP155
          // chains: ['hedera:testnet', 'hedera:mainnet'], // Hashpack only uses the first chain in the list
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    }

    const universalProvider = await HederaProvider.init(providerOpts)

    createAppKit({
      adapters: [nativeHederaAdapter, eip155HederaAdapter],
      logger: 'error' as const,
      //@ts-ignore
      universalProvider,
      projectId,
      metadata,
      networks,
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

    // Store config for later use
    setAppKitConfig({
      projectId,
      rpcUrl,
      jsonRpcProvider,
      universalProvider,
      nativeHederaAdapter,
      eip155HederaAdapter,
    })

    setIsConfigured(true)
  }

  // Show config form if not configured
  if (!isConfigured) {
    return <InitialConfigForm onSubmit={handleConfigSubmit} />
  }

  // Once configured, render the main app
  return <V2AppContent appKitConfig={appKitConfig} />
}

// Separate component that uses AppKit hooks (only rendered after createAppKit is called)
function V2AppContent({ appKitConfig }: { appKitConfig: any }) {
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { address, isConnected, caipAddress, status } = useAppKitAccount()
  const events = useAppKitEvents()
  console.log(events)
  const [showConfigModal, setShowConfigModal] = useState(false)

  console.log('xxxxxxxxxxxxxx')
  console.log(address, isConnected, caipAddress, status)
  console.log('xxxxxxxxxxxxxx')

  // Get the appropriate account based on namespace
  const hederaAccount =
    appKitConfig?.universalProvider?.session?.namespaces?.hedera?.accounts?.[0]
      ?.split(':')
      .pop()
  const eip155Account =
    appKitConfig?.universalProvider?.session?.namespaces?.eip155?.accounts?.[0]
      ?.split(':')
      .pop()

  return (
    <div className="pages">
      <div className="logos">
        <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
        <img src="/hedera.svg" alt="Hedera" style={{ width: '90px', height: '90px' }} />
      </div>
      <h1>Hedera App - V2 Connection</h1>
      {/* Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/v1">Switch to V1 Connection</Link>
      </div>
      {/* Connection Status */}
      <div
        style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
        }}
      >
        <p style={{ margin: '5px 0' }}>
          <strong>Connection Status:</strong> {isConnected ? 'Connected (V2)' : 'Not Connected'}
        </p>
        {isConnected && (
          <>
            <p style={{ margin: '5px 0' }}>
              <strong>Hedera Namespace V2 Account:</strong> {hederaAccount || 'N/A'}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>EIP Namespace V2 Account:</strong> {eip155Account || 'N/A'}
            </p>
          </>
        )}
      </div>

      {/* Connection Buttons */}
      {!isConnected && (
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            justifyContent: 'center',
          }}
        >
          <button
            // onClick={() => showModal(true)}
            onClick={async () =>
              await open({
                view: 'Connect',
                namespace: hederaNamespace, // Force hedera namespace for initial connection
              })
            }
            className="primary-button"
            style={{ backgroundColor: '#7B3FF2' }}
          >
            Connect with HWC v2
          </button>
        </div>
      )}

      {/* Disconnect Button */}
      {isConnected && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button
            onClick={async () => {
              await disconnect()
              location.reload()
            }}
            className="primary-button"
            style={{ backgroundColor: '#dc3545' }}
          >
            Disconnect V2
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {/*
      {isConnected &&
        v2Namespace &&
        (() => {
          const hederaMethods =
            v2Namespace === 'hedera' || v2Namespace === 'both'
              ? [
                  {
                    name: 'Get Node Addresses',
                    action: async () => {
                      try {
                        const result = await executeHederaMethod('hedera_getNodeAddresses', {})
                        setLastFunctionResult({
                          functionName: 'Get Node Addresses',
                          result: `Nodes: ${Array.isArray(result) ? result.join(', ') : result}`,
                        })
                      } catch (error) {
                        setLastFunctionResult({
                          functionName: 'Get Node Addresses',
                          result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
                        })
                      }
                    },
                  },
                  {
                    name: 'Sign Message',
                    action: async () => {
                      try {
                        const result = await executeHederaMethod('hedera_signMessage', {
                          message: 'Hello from Hedera V2 - ' + new Date().toISOString(),
                        })
                        setLastFunctionResult({
                          functionName: 'Sign Message',
                          result: 'Message signed successfully',
                        })
                      } catch (error) {
                        setLastFunctionResult({
                          functionName: 'Sign Message',
                          result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
                        })
                      }
                    },
                  },
                  {
                    name: 'Sign & Execute Transaction',
                    action: async () => {
                      try {
                        const result = await executeHederaMethod(
                          'hedera_signAndExecuteTransaction',
                          {
                            recipientId: '0.0.123456',
                            amount: '1',
                          },
                        )
                        setLastFunctionResult({
                          functionName: 'Sign & Execute Transaction',
                          result: `Transaction ID: ${result}`,
                        })
                      } catch (error) {
                        setLastFunctionResult({
                          functionName: 'Sign & Execute Transaction',
                          result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
                        })
                      }
                    },
                  },
                ]
              : []

          const ethMethods =
            v2Namespace === 'eip155' || v2Namespace === 'both'
              ? [
                  {
                    name: 'Execute ETH Method',
                    action: () =>
                      executeEthMethod('eth_getBalance', { address: eip155Account }),
                  },
                ]
              : []

          return (
            <ActionButtonList
              title={`V2 Connection Methods (${v2Namespace})`}
              methods={hederaMethods}
              ethMethods={ethMethods}
              onClearState={clearState}
              jsonRpcProvider={appKitConfig?.jsonRpcProvider}
            />
          )
        })()}
			*/}

      <div className="advice">
        <div style={{ fontSize: '12px', color: '#666' }}>
          <p>Current configuration:</p>
          <p>• Project ID: {appKitConfig?.projectId?.substring(0, 8)}...</p>
          <p>• RPC URL: {appKitConfig?.rpcUrl}</p>
          <button onClick={() => setShowConfigModal(true)} className="config">
            Update Configuration
          </button>
        </div>
      </div>
      {/*
      <InfoList
        hash={transactionHash}
        txId={transactionId}
        signedMsg={signedMsg}
        nodes={nodes}
        lastFunctionResult={lastFunctionResult}
        connectionMode="v2"
      />
			*/}
      {/* V2 Namespace Selection Modal */}
      {/*
      <V2NamespaceModal
        isOpen={modal}
        onClose={() => showModal(false)}
        onConnect={async () =>
          await open({
            view: 'Connect',
            namespace: hederaNamespace, // Force hedera namespace for initial connection
          })
        }
      />
			*/}
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
  )
}

export default V2App
