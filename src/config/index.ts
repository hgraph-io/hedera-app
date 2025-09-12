import { AppKitNetwork } from '@reown/appkit/networks'
import { HederaChainDefinition } from '@hashgraph/hedera-wallet-connect'

// Metadata for the app
export const metadata = {
  name: 'Hedera EIP155 & HIP820 Example',
  description: 'Hedera EIP155 & HIP820 Example',
  url: 'https://github.com/hashgraph/hedera-wallet-connect/',
  icons: ['https://avatars.githubusercontent.com/u/31002956'],
}

// Network configurations
export const networks = [
  HederaChainDefinition.Native.Mainnet,
  HederaChainDefinition.Native.Testnet,
  HederaChainDefinition.EVM.Testnet,
  HederaChainDefinition.EVM.Mainnet,
] as [AppKitNetwork, ...AppKitNetwork[]]

// Default RPC URL
export const DEFAULT_RPC_URL =
  'https://testnet.hedera.api.hgraph.io/v1/pk_prod_ab2c41b848c0b568e96a31ef0ca2f2fbaa549470/rpc'
