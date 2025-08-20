import './App.css'
import { useState, useEffect, useRef } from 'react'
import { createAppKit, useDisconnect, useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { HederaChainDefinition } from '@hashgraph/hedera-wallet-connect'
import { metadata, networks, DEFAULT_RPC_URL } from './config'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { V1ConnectionModal } from './components/V1ConnectionModal'
import { V2NamespaceModal } from './components/V2NamespaceModal'
import { ConfigurationModal } from './components/ConfigurationModal'
import { InitialConfigForm } from './components/InitialConfigForm'
import { SessionMonitor } from './utils/sessionMonitor'
import { useDAppConnectorV1 } from './hooks/useDAppConnectorV1'
import { useV1Methods } from './hooks/useV1Methods'
import { useHederaMethods } from './hooks/useHederaMethods'
import { useEthereumMethods } from './hooks/useEthereumMethods'

export interface FunctionResult {
  functionName: string
  result: string
}

type ConnectionMode = 'none' | 'v1' | 'v2'

// Main App component that handles configuration
export function App() {
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
    try {
      // Dynamically import config modules
      const { HederaProvider, HederaAdapter, hederaNamespace } = await import(
        '@hashgraph/hedera-wallet-connect'
      )
      const { JsonRpcProvider } = await import('ethers')
      const UniversalProvider = (await import('@walletconnect/universal-provider')).default

      // Create JSON RPC provider
      const jsonRpcProvider = new JsonRpcProvider(rpcUrl)

      // Create adapters
      const nativeHederaAdapter = new HederaAdapter({
        projectId,
        networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
        namespace: hederaNamespace,
      })

      const eip155HederaAdapter = new HederaAdapter({
        projectId,
        // Only testnet for EVM connections
        networks: [HederaChainDefinition.EVM.Testnet],
        namespace: 'eip155',
      })

      // Initialize HederaProvider with namespaces
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

      const providerOpts = {
        projectId,
        metadata,
        logger: 'debug' as const,
        requiredNamespaces: {
          hedera: {
            methods: hederaMethods,
            chains: ['hedera:testnet', 'hedera:mainnet'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
        optionalNamespaces: {
          eip155: {
            methods: eip155Methods,
            chains: ['eip155:296'], // Only testnet for EVM
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      }

      const initOpts = providerOpts as any
      if (HederaProvider.init.length > 0) {
        const testnetChainId = HederaChainDefinition.Native.Testnet.id
        initOpts.defaultChain =
          typeof testnetChainId === 'string' ? testnetChainId : `hedera:testnet`
      }

      const universalProvider = (await HederaProvider.init(
        initOpts,
      )) as unknown as typeof UniversalProvider.prototype

      // Create modal for V2
      console.log('📦 V2 AppKit Configuration:', {
        adapters: [
          { namespace: 'hedera', networks: ['testnet', 'mainnet'] },
          { namespace: 'eip155', networks: ['296', '295'] },
        ],
        defaultNetwork: 'hedera:testnet',
        requiredNamespaces: providerOpts.requiredNamespaces,
        optionalNamespaces: providerOpts.optionalNamespaces,
      })

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
    } catch (error) {
      console.error('Failed to initialize configuration:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(
        `Failed to initialize configuration: ${errorMessage}. Please check your settings and try again.`,
      )
    }
  }

  // Show config form if not configured
  if (!isConfigured) {
    return <InitialConfigForm onSubmit={handleConfigSubmit} />
  }

  // Once configured, render the main app
  return <AppContent appKitConfig={appKitConfig} />
}

// Separate component that uses AppKit hooks (only rendered after createAppKit is called)
function AppContent({ appKitConfig }: { appKitConfig: any }) {
  const { disconnect: disconnectV2 } = useDisconnect()
  const { open } = useAppKit()
  const { isConnected: isAppKitConnected, address: appKitAddress } = useAppKitAccount()
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
  const v1Methods = useV1Methods(v1Connection.signers)

  const clearState = () => {
    setTransactionHash('')
    setTransactionId('')
    setSignedMsg('')
    setNodes([])
    setLastFunctionResult(null)
  }

  // Initialize session monitor and listen for connection events
  useEffect(() => {
    if (appKitConfig?.universalProvider) {
      sessionMonitorRef.current = new SessionMonitor(appKitConfig.universalProvider)

      // Listen for session events to update state immediately
      const handleSessionUpdate = () => {
        console.log('Session update detected, checking connection state...')
        // Force a re-check of the connection state
        setConnectionMode((prev) => {
          // Trigger the connection mode detection logic
          const hasV1SessionMarker = sessionStorage.getItem('hwcV1Session')

          if (hasV1SessionMarker && v1Connection.isConnected && v1Connection.session) {
            return 'v1'
          } else if (
            appKitConfig?.universalProvider?.session &&
            (appKitConfig.universalProvider.session.namespaces?.hedera ||
              appKitConfig.universalProvider.session.namespaces?.eip155)
          ) {
            console.log('✅ V2 Connection detected after session update')
            return 'v2'
          }
          return 'none'
        })
      }

      // Listen for connection events
      appKitConfig.universalProvider.on('connect', handleSessionUpdate)
      appKitConfig.universalProvider.on('session_update', handleSessionUpdate)

      return () => {
        appKitConfig.universalProvider.off('connect', handleSessionUpdate)
        appKitConfig.universalProvider.off('session_update', handleSessionUpdate)
      }
    }
  }, [appKitConfig, v1Connection.isConnected, v1Connection.session])

  // Handle V2 connection with namespace selection
  const handleV2Connect = async (namespace: 'hedera' | 'eip155' | 'both') => {
    try {
      console.log('🔗 V2 Connection: User selected namespace:', namespace)

      // Store the selected namespace in session storage for reference
      sessionStorage.setItem('selectedHWCv2Namespace', namespace)

      // Store the namespace configuration for the provider to use
      let connectParams: any = {}

      if (namespace === 'hedera') {
        connectParams = {
          // Use optionalNamespaces for better wallet compatibility
          optionalNamespaces: {
            hedera: {
              methods: [
                'hedera_getAccountBalance',
                'hedera_getAccountInfo',
                'hedera_getTransactionReceipt',
                'hedera_executeTransaction',
                'hedera_signMessage',
                'hedera_signTransaction',
                'hedera_signAndExecuteTransaction',
                'hedera_signAndExecuteQuery',
              ],
              chains: ['hedera:testnet', 'hedera:mainnet'],
              events: ['chainChanged', 'accountsChanged'],
            },
          },
        }
      } else if (namespace === 'eip155') {
        connectParams = {
          // Use optionalNamespaces for better wallet compatibility
          optionalNamespaces: {
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
              // Only testnet (296) for EVM connections
              chains: ['eip155:296'],
              events: ['chainChanged', 'accountsChanged'],
            },
          },
        }
      } else {
        // 'both' - use requiredNamespaces for hedera and optionalNamespaces for eip155
        // This seems to work better with UniversalProvider
        connectParams = {
          requiredNamespaces: {
            hedera: {
              methods: [
                'hedera_getAccountBalance',
                'hedera_getAccountInfo',
                'hedera_getTransactionReceipt',
                'hedera_executeTransaction',
                'hedera_signMessage',
                'hedera_signTransaction',
                'hedera_signAndExecuteTransaction',
                'hedera_signAndExecuteQuery',
              ],
              chains: ['hedera:testnet', 'hedera:mainnet'],
              events: ['chainChanged', 'accountsChanged'],
            },
          },
          optionalNamespaces: {
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
              // Only testnet (296) for EVM connections
              chains: ['eip155:296'],
              events: ['chainChanged', 'accountsChanged'],
            },
          },
        }
      }

      console.log('🚀 Opening V2 modal with namespaces:', connectParams)

      // Store the namespace params for the provider to use when connect is called
      sessionStorage.setItem('hwcV2ConnectionParams', JSON.stringify(connectParams))

      // Open the modal - AppKit will internally call connect on the universal provider
      await open({
        view: 'Connect',
      })

      // The AppKit hooks will detect the connection and update the state automatically
      // No need for polling since we're now monitoring isAppKitConnected
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

  // Track connection mode - check V1 first since both V1 and V2 use universalProvider
  useEffect(() => {
    // Check if this is a V1 connection first (has V1 session marker)
    const hasV1SessionMarker = sessionStorage.getItem('hwcV1Session')

    if (hasV1SessionMarker && v1Connection.isConnected && v1Connection.session) {
      // This is a V1 connection
      console.log('✅ V1 Connection Detected (from session marker)')
      setConnectionMode('v1')
    } else if (
      isAppKitConnected &&
      appKitAddress &&
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

      // Log what namespace will be detected
      const detectedNamespaces = appKitConfig.universalProvider.session.namespaces
      console.log('🔍 Namespace detection:', {
        hasHedera: !!detectedNamespaces?.hedera,
        hasEip155: !!detectedNamespaces?.eip155,
        willBeDetectedAs:
          detectedNamespaces?.hedera && detectedNamespaces?.eip155
            ? 'both'
            : detectedNamespaces?.hedera
              ? 'hedera'
              : detectedNamespaces?.eip155
                ? 'eip155'
                : 'none',
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
    } else {
      setConnectionMode('none')
    }
  }, [
    v1Connection.isConnected,
    v1Connection.session,
    appKitConfig?.universalProvider?.session,
    isAppKitConnected,
    appKitAddress,
  ])

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

        // V1 also uses universalProvider, so we need to disconnect it too
        if (appKitConfig?.universalProvider?.session) {
          try {
            await appKitConfig.universalProvider.disconnect()
          } catch (error) {
            console.log('UniversalProvider disconnect error (V1):', error)
          }
        }

        // Clear any WalletConnect session data to prevent confusion
        const wcKeys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith('wc@') ||
            key.startsWith('walletconnect') ||
            key.startsWith('WC_') ||
            key.includes('walletConnect'),
        )
        wcKeys.forEach((key) => {
          localStorage.removeItem(key)
        })
      } else if (connectionMode === 'v2') {
        // Clear v2 namespace marker
        sessionStorage.removeItem('selectedHWCv2Namespace')
        sessionStorage.removeItem('hwcV2ConnectionOptions')
        sessionStorage.removeItem('hwcV2ConnectionParams')

        // Always try to disconnect if there's a session
        if (appKitConfig?.universalProvider?.session) {
          // First disconnect from AppKit
          await disconnectV2()

          // Then disconnect the universal provider itself
          if (appKitConfig.universalProvider.disconnect) {
            await appKitConfig.universalProvider.disconnect()
          }

          // Clear the persisted WalletConnect session data from localStorage
          // This prevents auto-reconnect on page refresh
          const wcKeys = Object.keys(localStorage).filter(
            (key) =>
              key.startsWith('wc@') ||
              key.startsWith('walletconnect') ||
              key.startsWith('WC_') ||
              key.includes('walletConnect'),
          )
          wcKeys.forEach((key) => {
            localStorage.removeItem(key)
          })

          // Also clear any Reown/AppKit specific storage
          const reownKeys = Object.keys(localStorage).filter(
            (key) =>
              key.includes('reown') ||
              key.includes('appkit') ||
              key.includes('@w3m') ||
              key.includes('W3M_'),
          )
          reownKeys.forEach((key) => {
            // Keep the project ID and RPC URL
            if (!key.includes('reownProjectId') && !key.includes('hederaRpcUrl')) {
              localStorage.removeItem(key)
            }
          })
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
      // Always clear state even on error
      clearState()
      setConnectionMode('none')
    }
  }

  // Add global error handler for undefined property errors
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
      const result = await v1Methods.executeMethod('transferHbar', {
        to: '0.0.123456',
        amount: 1,
      })
      if (result) {
        setTransactionId(result.transactionId)
        setLastFunctionResult({
          functionName: 'V1 Transfer HBAR',
          result: `Status: ${result.status}`,
        })
      }
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
      const result = await v1Methods.executeMethod('signMessage', { message })
      if (result) {
        setSignedMsg(result.signature)
        setLastFunctionResult({
          functionName: 'V1 Sign Message',
          result: 'Message signed successfully',
        })
      }
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
      const result = await v1Methods.executeMethod('getAccountBalance')
      if (result) {
        setLastFunctionResult({
          functionName: 'V1 Account Balance',
          result: `${result.balance}`,
        })
      }
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
    console.log('Current session namespaces:', namespaces)
    if (namespaces?.hedera && namespaces?.eip155) return 'both'
    if (namespaces?.hedera) return 'hedera'
    if (namespaces?.eip155) return 'eip155'
    return null
  }

  // Get namespace and address info for UI
  const v2Namespace = getCurrentV2Namespace()

  // Get the appropriate account based on namespace
  const hederaAccount =
    appKitConfig?.universalProvider?.session?.namespaces?.hedera?.accounts?.[0]
      ?.split(':')
      .pop()
  const eip155Account =
    appKitConfig?.universalProvider?.session?.namespaces?.eip155?.accounts?.[0]
      ?.split(':')
      .pop()

  // For display purposes, show the appropriate account
  const v2Account =
    v2Namespace === 'hedera' || v2Namespace === 'both' ? hederaAccount : eip155Account

  // Get hooks for V2 operations
  const { executeHederaMethod } = useHederaMethods({
    walletProvider: connectionMode === 'v2' ? appKitConfig?.universalProvider : null,
    chainId: 296,
    account: hederaAccount, // Always use Hedera account for Hedera methods
    sendHash: setTransactionHash,
    sendSignedMsg: setSignedMsg,
    sendTransactionId: setTransactionId,
    sendNodes: setNodes,
    sendFunctionResult: setLastFunctionResult,
  })

  const { executeEthMethod } = useEthereumMethods({
    walletProvider: connectionMode === 'v2' ? appKitConfig?.universalProvider : null,
    chainId: 296,
    address: eip155Account, // Always use EIP155 account for Ethereum methods
    ethTxHash: transactionHash,
    sendHash: setTransactionHash,
    sendSignMsg: setSignedMsg,
    jsonRpcProvider: appKitConfig?.jsonRpcProvider,
  })

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
          style={{
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: '5px 0' }}>
            <strong>Connection Mode:</strong>{' '}
            {connectionMode === 'none' ? 'Not Connected' : connectionMode.toUpperCase()}
          </p>
          {connectionMode === 'v1' && (
            <p style={{ margin: '5px 0' }}>
              <strong>V1 Account:</strong> {v1Connection.accountId || 'N/A'}
            </p>
          )}
          {connectionMode === 'v2' && (
            <>
              <p style={{ margin: '5px 0' }}>
                <strong>V2 Namespace:</strong> {v2Namespace || 'N/A'}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>V2 Account:</strong> {v2Account || 'N/A'}
              </p>
            </>
          )}
        </div>

        {/* Connection Buttons */}
        {connectionMode === 'none' ? (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={async () => {
                // Initialize V1 connector to detect extensions before showing modal
                await v1Connection.initializeConnector()
                setShowV1Modal(true)
              }}
              className="primary-button"
              style={{ backgroundColor: '#7B3FF2' }}
            >
              Connect with HWC v1
            </button>
            <button
              onClick={() => setShowV2NamespaceModal(true)}
              className="primary-button"
              style={{ backgroundColor: '#7B3FF2' }}
            >
              Connect with HWC v2
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <button
              onClick={handleDisconnect}
              className="primary-button"
              style={{ backgroundColor: '#dc3545' }}
            >
              Disconnect {connectionMode.toUpperCase()}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {connectionMode === 'v1' && (
          <ActionButtonList
            title="V1 Connection Methods"
            methods={[
              { name: 'Get Balance', action: handleV1Balance },
              { name: 'Transfer HBAR', action: handleV1Transfer },
              { name: 'Sign Message', action: handleV1SignMessage },
            ]}
            onClearState={clearState}
            jsonRpcProvider={appKitConfig?.jsonRpcProvider}
          />
        )}

        {connectionMode === 'v2' &&
          v2Namespace &&
          (() => {
            const hederaMethods =
              v2Namespace === 'hedera' || v2Namespace === 'both'
                ? [
                    {
                      name: 'Execute Hedera Method',
                      action: () => executeHederaMethod('hedera_getAccountInfo', {}),
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

            console.log('Rendering methods for namespace:', v2Namespace, {
              hederaMethods: hederaMethods.length,
              ethMethods: ethMethods.length,
              eip155Account,
            })

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
          connectionMode={connectionMode}
        />

        {/* V1 Connection Modal */}
        <V1ConnectionModal
          isOpen={showV1Modal}
          onClose={() => setShowV1Modal(false)}
          onConnect={async (extensionData) => {
            const success = await v1Connection.connect(extensionData)
            if (success) {
              setShowV1Modal(false)
            }
            return success
          }}
          availableExtensions={v1Connection.getAvailableExtensions() || []}
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

export default App
