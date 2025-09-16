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
import { ConfigurationModal } from './components/ConfigurationModal'
import { InitialConfigForm } from './components/InitialConfigForm'
import { useHederaMethods } from './hooks/useHederaMethods'
import { useEthereumMethods } from './hooks/useEthereumMethods'
import { MethodExecutor } from './components/MethodExecutor'

export interface FunctionResult {
  functionName: string
  result: string
}

// Main V2App component that handles configuration
export function V2App() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [appKitConfig, setAppKitConfig] = useState<{
    projectId: string
    rpcUrl: string
    jsonRpcProvider: JsonRpcProvider
    universalProvider: HederaProvider
    nativeHederaAdapter: HederaAdapter
    eip155HederaAdapter: HederaAdapter
  } | null>(null)

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
          chains: ['eip155:296', 'eip155:295'], // Testnet first, then mainnet
          events: ['chainChanged', 'accountsChanged'],
          rpcMap: {
            'eip155:296': rpcUrl || 'https://testnet.hashio.io/api',
            'eip155:295': 'https://mainnet.hashio.io/api',
          },
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
          chains: ['hedera:testnet', 'hedera:mainnet'], // Hashpack only uses the first chain in the list, also this seems to dictate testnet vs mainnet for EIP155
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    }

    const universalProvider = await HederaProvider.init(providerOpts)

    createAppKit({
      adapters: [nativeHederaAdapter, eip155HederaAdapter],
      logger: 'error' as const,
      // @ts-expect-error universalProvider type compatibility
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
function V2AppContent({
  appKitConfig,
}: {
  appKitConfig: {
    projectId: string
    rpcUrl: string
    jsonRpcProvider: JsonRpcProvider
    universalProvider: HederaProvider
    nativeHederaAdapter: HederaAdapter
    eip155HederaAdapter: HederaAdapter
  } | null
}) {
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { address, isConnected, caipAddress, status } = useAppKitAccount()
  const events = useAppKitEvents()
  console.log(events)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [signedMsg, setSignedMsg] = useState('')
  const [nodes, setNodes] = useState<string[]>([])

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

  // Get chain ID for EIP155
  const eip155ChainId =
    appKitConfig?.universalProvider?.session?.namespaces?.eip155?.chains?.[0]?.split(':')[1]
      ? parseInt(
          appKitConfig.universalProvider.session.namespaces.eip155.chains[0].split(':')[1],
        )
      : undefined

  // Setup Hedera methods
  const { executeHederaMethod } = useHederaMethods(
    appKitConfig?.universalProvider,
    hederaAccount || '',
    setTransactionId,
    setSignedMsg,
    setNodes,
  )

  // Setup Ethereum methods
  const { executeEthMethod } = useEthereumMethods({
    walletProvider: appKitConfig?.universalProvider,
    chainId: eip155ChainId,
    address: eip155Account,
    ethTxHash: transactionHash,
    sendHash: setTransactionHash,
    sendSignMsg: setSignedMsg,
    jsonRpcProvider: appKitConfig?.jsonRpcProvider,
  })

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
          padding: '15px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#333' }}>
          Connection Information
        </h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#00c851' : '#ff4444',
              }}
            />
            <span style={{ fontSize: '14px' }}>
              <strong>Status:</strong> {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          {isConnected && (
            <>
              <div style={{ fontSize: '14px' }}>
                <strong>Protocol:</strong> HWC v2 (AppKit)
              </div>
              {hederaAccount && (
                <div style={{ fontSize: '14px' }}>
                  <strong>Hedera Account:</strong>{' '}
                  <code
                    style={{
                      backgroundColor: '#e0e0e0',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {hederaAccount}
                  </code>
                </div>
              )}
              {eip155Account && (
                <div style={{ fontSize: '14px' }}>
                  <strong>EIP155 Account:</strong>{' '}
                  <code
                    style={{
                      backgroundColor: '#e0e0e0',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {eip155Account}
                  </code>
                </div>
              )}
              <div style={{ fontSize: '14px' }}>
                <strong>Network:</strong>{' '}
                {appKitConfig?.universalProvider?.session?.namespaces?.hedera?.chains?.[0] ===
                  'hedera:mainnet' ||
                appKitConfig?.universalProvider?.session?.namespaces?.eip155?.chains?.[0] ===
                  'eip155:295'
                  ? 'Mainnet'
                  : 'Testnet'}
              </div>
              <div style={{ fontSize: '14px' }}>
                <strong>Active Namespaces:</strong>{' '}
                {[hederaAccount && 'Hedera', eip155Account && 'EIP155']
                  .filter(Boolean)
                  .join(', ')}
              </div>
              <div style={{ fontSize: '14px' }}>
                <strong>CAIP Address:</strong>{' '}
                <code
                  style={{
                    backgroundColor: '#e0e0e0',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                >
                  {caipAddress || 'N/A'}
                </code>
              </div>
            </>
          )}
        </div>
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

      {/* Method Executors */}
      {isConnected && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {/* Hedera Methods */}
          {hederaAccount && (
            <div style={{ flex: 1 }}>
              <MethodExecutor
                namespace="hedera"
                isConnected={isConnected}
                onExecute={executeHederaMethod}
                address={hederaAccount}
              />
            </div>
          )}

          {/* EIP155 Methods */}
          {eip155Account && (
            <div style={{ flex: 1 }}>
              <MethodExecutor
                namespace="eip155"
                isConnected={isConnected}
                onExecute={executeEthMethod}
                address={eip155Account}
              />
            </div>
          )}
        </div>
      )}

      {/* Results Display */}
      {isConnected &&
        (transactionHash || transactionId || signedMsg || (nodes && nodes.length > 0)) && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <h3>Recent Results</h3>
            {transactionHash && (
              <div style={{ marginBottom: '10px' }}>
                <strong>ETH Transaction Hash:</strong>
                <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  {transactionHash}
                </pre>
              </div>
            )}
            {transactionId && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Hedera Transaction ID:</strong>
                <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>{transactionId}</pre>
              </div>
            )}
            {signedMsg && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Signed Message:</strong>
                <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>{signedMsg}</pre>
              </div>
            )}
            {nodes && nodes.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Node Addresses:</strong>
                <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  {nodes.join(', ')}
                </pre>
              </div>
            )}
            <button
              onClick={() => {
                setTransactionHash('')
                setTransactionId('')
                setSignedMsg('')
                setNodes([])
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Clear Results
            </button>
          </div>
        )}

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
