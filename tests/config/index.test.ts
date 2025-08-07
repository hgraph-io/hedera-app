import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const initSpy = vi.fn().mockResolvedValue({ id: 'provider' })
const constructorSpy = vi.fn()

vi.mock('@hashgraph/hedera-wallet-connect', () => {
  return {
    HederaProvider: { init: initSpy },
    HederaAdapter: class {
      constructor(options: any) {
        constructorSpy(options)
      }
    },
    HederaChainDefinition: {
      Native: { Mainnet: 'native-mainnet', Testnet: 'native-testnet' },
      EVM: { Mainnet: 'evm-mainnet', Testnet: 'evm-testnet' },
    },
    hederaNamespace: 'hedera',
  }
})

vi.mock('@reown/appkit/networks', () => ({ AppKitNetwork: {} }))

vi.mock('@walletconnect/universal-provider', () => ({ default: class UniversalProvider {} }))

const JsonRpcProviderSpy = vi.fn()
vi.mock('ethers', () => ({
  JsonRpcProvider: class {
    constructor(url: string) {
      JsonRpcProviderSpy(url)
    }
  },
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  delete process.env.VITE_REOWN_PROJECT_ID
  delete process.env.VITE_HEDERA_RPC_URL
})

afterEach(() => {
  delete process.env.VITE_REOWN_PROJECT_ID
  delete process.env.VITE_HEDERA_RPC_URL
})

describe('config module', () => {
  it('throws when projectId is missing', async () => {
    await expect(import('../../src/config/index')).rejects.toThrow('Project ID is not defined')
  })

  it('exports expected values', async () => {
    process.env.VITE_REOWN_PROJECT_ID = 'pid123'
    const config = await import('../../src/config/index')

    expect(config.projectId).toBe('pid123')
    expect(config.metadata).toEqual({
      name: 'Hedera EIP155 & HIP820 Example',
      description: 'Hedera EIP155 & HIP820 Example',
      url: 'https://github.com/hashgraph/hedera-wallet-connect/',
      icons: ['https://avatars.githubusercontent.com/u/31002956'],
    })
    expect(config.networks).toEqual([
      'native-testnet',
      'native-mainnet',
      'evm-testnet',
      'evm-mainnet',
    ])
    expect(constructorSpy).toHaveBeenCalledTimes(2)
    expect(constructorSpy).toHaveBeenNthCalledWith(1, {
      projectId: 'pid123',
      networks: ['native-testnet', 'native-mainnet'],
      namespace: 'hedera',
      namespaceMode: 'required',
    })
    expect(constructorSpy).toHaveBeenNthCalledWith(2, {
      projectId: 'pid123',
      networks: ['evm-testnet', 'evm-mainnet'],
      namespace: 'eip155',
      namespaceMode: 'required',
    })
    expect(initSpy).toHaveBeenCalledWith({
      projectId: 'pid123',
      metadata: config.metadata,
      logger: 'debug',
    })
    expect(config.universalProvider).toEqual({ id: 'provider' })
  })

  it('uses default hedera RPC URL when not provided', async () => {
    process.env.VITE_REOWN_PROJECT_ID = 'pid123'
    await import('../../src/config/index')

    expect(JsonRpcProviderSpy).toHaveBeenCalledWith(
      'https://testnet.hedera.api.hgraph.io/v1/pk_test/rpc',
    )
  })

  it('uses custom hedera RPC URL when provided', async () => {
    process.env.VITE_REOWN_PROJECT_ID = 'pid123'
    process.env.VITE_HEDERA_RPC_URL = 'https://custom.rpc.url'
    await import('../../src/config/index')

    expect(JsonRpcProviderSpy).toHaveBeenCalledWith('https://custom.rpc.url')
  })
})
