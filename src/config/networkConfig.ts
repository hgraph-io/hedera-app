import { HederaChainDefinition } from '@hashgraph/hedera-wallet-connect'

// Export default testnet configuration
export const DEFAULT_TESTNET_CHAIN_ID = 'hedera:testnet'
export const DEFAULT_TESTNET_NETWORK = HederaChainDefinition.Native.Testnet

// Ensure testnet is the default network
export function getDefaultNetwork() {
  return DEFAULT_TESTNET_NETWORK
}

// Get network by chain ID
export function getNetworkByChainId(chainId: string) {
  const networks = [
    HederaChainDefinition.Native.Testnet,
    HederaChainDefinition.Native.Mainnet,
    HederaChainDefinition.EVM.Testnet,
    HederaChainDefinition.EVM.Mainnet,
  ]

  return networks.find((n) => {
    const networkId = typeof n.id === 'string' ? n.id : `${n.chainNamespace}:${n.id}`
    return networkId === chainId
  })
}

// Ensure testnet appears first in network list
export function sortNetworksTestnetFirst(networks: any[]) {
  return networks.sort((a, b) => {
    const aIsTestnet = a.name?.toLowerCase().includes('testnet') || false
    const bIsTestnet = b.name?.toLowerCase().includes('testnet') || false

    if (aIsTestnet && !bIsTestnet) return -1
    if (!aIsTestnet && bIsTestnet) return 1
    return 0
  })
}
