import { WcHelpersUtil } from '@reown/appkit'
import { CaipNetwork, CaipNetworkId, ChainNamespace } from '@reown/appkit-common'
import { defineChain } from '@reown/appkit/networks'
import { Namespace, NamespaceConfig } from '@walletconnect/universal-provider'
import { HederaJsonRpcMethod } from '@hashgraph/hedera-wallet-connect'

const assets = {
  imageId: undefined,
  imageUrl: '/hedera.svg',
}

export const hederaMainnetNative = defineChain({
  id: 'mainnet',
  chainNamespace: 'hedera' as ChainNamespace,
  caipNetworkId: 'hedera:mainnet' as CaipNetworkId,
  name: 'Hedera Mainnet',
  nativeCurrency: {
    symbol: 'ℏ',
    name: 'HBAR',
    decimals: 8,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hashscan',
      url: 'https://hashscan.io/mainnet',
    },
  },
  testnet: false,
  assets,
})

export const hederaTestnetNative = defineChain({
  id: 'testnet',
  chainNamespace: 'hedera' as ChainNamespace,
  caipNetworkId: 'hedera:testnet' as CaipNetworkId,
  name: 'Hedera Testnet',
  nativeCurrency: {
    symbol: 'ℏ',
    name: 'HBAR',
    decimals: 8,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hashscan',
      url: 'https://hashscan.io/testnet',
    },
  },
  testnet: true,
  assets,
})

export const hederaTestnetEvm = defineChain({
  id: 296,
  name: 'Hedera Testnet EVM',
  chainNamespace: 'eip155',
  caipNetworkId: 'eip155:296',
  nativeCurrency: {
    symbol: 'ℏ',
    name: 'HBAR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hashscan',
      url: 'https://hashscan.io/testnet',
    },
  },
  testnet: true,
  assets,
})

export const hederaMainnetEvm = defineChain({
  id: 295,
  name: 'Hedera Mainnet EVM',
  chainNamespace: 'eip155',
  caipNetworkId: 'eip155:295',
  nativeCurrency: {
    symbol: 'ℏ',
    name: 'HBAR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hashscan',
      url: 'https://hashscan.io/testnet',
    },
  },
  testnet: false,
  assets,
})

// Support Hedera Networks
export function createNamespaces(caipNetworks: CaipNetwork[]): NamespaceConfig {
  return caipNetworks.reduce<NamespaceConfig>((acc, chain) => {
    const { id, chainNamespace, rpcUrls } = chain
    const rpcUrl = rpcUrls.default.http[0]

    const methods =
      chainNamespace == ('hedera' as ChainNamespace)
        ? Object.values(HederaJsonRpcMethod)
        : WcHelpersUtil.getMethodsByChainNamespace(chainNamespace)

    if (!acc[chainNamespace]) {
      acc[chainNamespace] = {
        methods,
        events: ['accountsChanged', 'chainChanged'],
        chains: [],
        rpcMap: {},
      } satisfies Namespace
    }

    const caipNetworkId = `${chainNamespace}:${id}`

    const namespace = acc[chainNamespace] as Namespace

    namespace.chains.push(caipNetworkId)

    if (namespace?.rpcMap && rpcUrl) {
      namespace.rpcMap[id] = rpcUrl
    }

    return acc
  }, {})
}
