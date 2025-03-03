import { AppKitNetwork } from '@reown/appkit/networks'
import {
  HederaProvider,
  HederaAdapter,
  HederaChainDefinition,
} from '@hashgraph/hedera-wallet-connect'

// Get projectId from https://cloud.reown.com
export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

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
  HederaChainDefinition.Native.Mainnet,
  HederaChainDefinition.Native.Testnet,
  HederaChainDefinition.EVM.Mainnet,
  HederaChainDefinition.EVM.Testnet,
] as [AppKitNetwork, ...AppKitNetwork[]]

export const nativeHederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.Native.Mainnet, HederaChainDefinition.Native.Testnet],
  namespace: 'hedera',
})

export const eip155HederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.EVM.Mainnet, HederaChainDefinition.EVM.Testnet],
  namespace: 'eip155',
})

export const universalProvider = await HederaProvider.init({
  projectId,
  metadata,
  logger: 'debug',
})
