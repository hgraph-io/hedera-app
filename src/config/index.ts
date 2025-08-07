import { AppKitNetwork } from '@reown/appkit/networks'
import {
  HederaProvider,
  HederaAdapter,
  HederaChainDefinition,
  hederaNamespace,
} from '@hashgraph/hedera-wallet-connect'
import UniversalProvider from '@walletconnect/universal-provider'
import { JsonRpcProvider } from 'ethers'

// Get projectId from https://cloud.reown.com
export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID
export const hederaRpcUrl =
  import.meta.env.VITE_HEDERA_RPC_URL || 'https://testnet.hedera.api.hgraph.io/v1/pk_test/rpc'
export const jsonRpcProvider = new JsonRpcProvider(hederaRpcUrl)

if (!projectId) {
  throw new Error('Project ID is not defined')
}

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

export const nativeHederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
  namespace: hederaNamespace,
})

export const eip155HederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
  namespace: 'eip155',
})

// Initialize HederaProvider with proper chain configuration
const providerOpts = {
  projectId,
  metadata,
  logger: 'debug' as const,
}

// Add chains if supported by the provider
const initOpts = providerOpts as any
if (HederaProvider.init.length > 0) {
  // Try to configure chains for testnet preference
  const testnetChainId = HederaChainDefinition.Native.Testnet.id
  
  // Set default chain if possible
  initOpts.defaultChain = typeof testnetChainId === 'string' ? testnetChainId : `hedera:testnet`
}

export const universalProvider = (await HederaProvider.init(initOpts)) as unknown as UniversalProvider // avoid type mismatch error due to missing of private properties in HederaProvider
