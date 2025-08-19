import { useState, useEffect } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { InitialConfigForm } from './components/InitialConfigForm'
import { AppWithConfig } from './AppWithConfig'
import { HederaChainDefinition } from '@hashgraph/hedera-wallet-connect'
import { metadata, networks, DEFAULT_RPC_URL } from './config'

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
        networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
        namespace: 'eip155',
      })

      // Initialize HederaProvider
      const providerOpts = {
        projectId,
        metadata,
        logger: 'debug' as const,
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
      alert('Failed to initialize configuration. Please check your settings and try again.')
    }
  }

  // Show config form if not configured
  if (!isConfigured) {
    return <InitialConfigForm onSubmit={handleConfigSubmit} />
  }

  // Once configured, render the main app with access to hooks
  return <AppWithConfig appKitConfig={appKitConfig} />
}

export default App
