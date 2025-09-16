import { AppKitNetwork } from '@reown/appkit/networks'
import {
  HederaProvider,
  HederaAdapter,
  HederaChainDefinition,
  hederaNamespace,
} from '@hashgraph/hedera-wallet-connect'
import UniversalProvider from '@walletconnect/universal-provider'
import { JsonRpcProvider } from 'ethers'
import { createAppKit } from '@reown/appkit/react'

export const metadata = {
  name: 'Hedera EIP155 & HIP820 Example',
  description: 'Hedera EIP155 & HIP820 Example',
  url: 'https://github.com/hashgraph/hedera-wallet-connect/',
  icons: ['https://avatars.githubusercontent.com/u/31002956'],
}

export const networks = [
  HederaChainDefinition.Native.Testnet,
  HederaChainDefinition.Native.Mainnet,
  HederaChainDefinition.EVM.Testnet,
  HederaChainDefinition.EVM.Mainnet,
] as [AppKitNetwork, ...AppKitNetwork[]]

export async function createDynamicConfig(projectId: string, rpcUrl: string) {
  // Create JSON RPC provider
  const jsonRpcProvider = new JsonRpcProvider(rpcUrl)

  // Create adapters with the provided project ID
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

  // Initialize HederaProvider with proper chain configuration
  const providerOpts = {
    projectId,
    metadata,
    logger: 'error' as const,
  }

  // Add chains if supported by the provider
  const initOpts = providerOpts as any
  if (HederaProvider.init.length > 0) {
    // Try to configure chains for testnet preference
    const testnetChainId = HederaChainDefinition.Native.Testnet.id

    // Set default chain if possible
    initOpts.defaultChain =
      typeof testnetChainId === 'string' ? testnetChainId : `hedera:testnet`
  }

  const universalProvider = (await HederaProvider.init(
    initOpts,
  )) as unknown as UniversalProvider

  // Create AppKit modal
  const modal = createAppKit({
    adapters: [nativeHederaAdapter, eip155HederaAdapter],
    universalProvider: universalProvider as any,
    defaultNetwork: HederaChainDefinition.Native.Testnet as any,
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

  return {
    modal,
    universalProvider,
    jsonRpcProvider,
    nativeHederaAdapter,
    eip155HederaAdapter,
  }
}
