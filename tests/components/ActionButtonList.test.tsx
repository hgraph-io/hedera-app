import { render } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'

let activeChain: string
let walletProvider: any

function createWalletProviderMock() {
  const httpProvider = { request: vi.fn(async ({ method }: any) => method + '_result') }
  return new Proxy(
    { rpcProviders: { eip155: { httpProviders: { 1: httpProvider } } } },
    {
      get(target, prop: string) {
        if (!target[prop]) {
          if (prop === 'hedera_signAndExecuteQuery') {
            target[prop] = vi.fn(async () => ({
              response: Buffer.from('data').toString('base64'),
            }))
          } else if (prop === 'hedera_getNodeAddresses') {
            target[prop] = vi.fn(async () => ({ nodes: ['n1'] }))
          } else if (
            prop === 'hedera_executeTransaction' ||
            prop === 'hedera_signAndExecuteTransaction'
          ) {
            target[prop] = vi.fn(async () => ({ transactionId: 'tid' }))
          } else {
            target[prop] = vi.fn(async () => prop + '_result')
          }
        }
        return target[prop]
      },
    },
  )
}

vi.mock('ethers', () => {
  class BrowserProvider {
    constructor(_: any, __: any) {}
    async getBalance() {
      return 1n
    }
    async send() {
      return 'rawHash'
    }
  }
  class JsonRpcSigner {
    constructor(_: any, __: any) {}
    async sendTransaction() {
      return { hash: 'txHash' }
    }
    async signTransaction() {
      return 'signedTx'
    }
    async signMessage() {
      return 'signature'
    }
    async signTypedData() {
      return 'typedSignature'
    }
  }
  class JsonRpcProvider {
    constructor(_: any) {}
    async request({ method }: any) {
      return method + '_result'
    }
  }
  return {
    BrowserProvider,
    JsonRpcProvider,
    JsonRpcSigner,
    parseEther: () => 1n,
    formatEther: (v: any) => String(v),
    getBigInt: (v: any) => BigInt(v),
    hexlify: (v: any) => '0x' + String(v),
  }
})

vi.mock('@hashgraph/sdk', () => {
  class Hbar {
    constructor(_: number) {}
    negated() {
      return this
    }
  }
  class TransferTransaction {
    setTransactionId() {
      return this
    }
    addHbarTransfer() {
      return this
    }
    setMaxTransactionFee() {
      return this
    }
    freezeWith() {
      return this
    }
  }
  const TransactionId = { generate: () => 'tid' }
  class AccountInfoQuery {
    setAccountId() {
      return this
    }
  }
  const AccountInfo = { fromBytes: () => ({ info: 'data' }) }
  return {
    Hbar,
    TransferTransaction,
    TransactionId,
    AccountInfoQuery,
    AccountInfo,
  }
})

vi.mock('@reown/appkit/react', () => ({
  useAppKitState: () => ({ activeChain }),
  useAppKitProvider: () => ({ walletProvider }),
  useAppKitAccount: () => ({
    address: '0xabc',
    caipAddress: 'eip155:1:0xabc',
    isConnected: true,
    status: 'connected',
  }),
  useAppKitNetworkCore: () => ({ chainId: 1 }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
}))

vi.mock('../../src/config', () => ({
  jsonRpcProvider: { send: vi.fn() },
}))

vi.mock('../../src/hooks/useEthereumMethods', () => ({
  useEthereumMethods: vi.fn(() => ({
    executeEthMethod: vi.fn(async (method: string) => method + '_result'),
  })),
}))

vi.mock('../../src/hooks/useHederaMethods', () => ({
  useHederaMethods: vi.fn(() => ({
    executeHederaMethod: vi.fn(async (method: string) => method + '_result'),
  })),
}))

import { ActionButtonList } from '../../src/components/ActionButtonList'

describe('ActionButtonList', () => {
  beforeEach(() => {
    activeChain = 'eip155'
    walletProvider = createWalletProviderMock()
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(
      <ActionButtonList
        connected={true}
        executeHederaMethod={vi.fn()}
        executeEthMethod={vi.fn()}
        setEthTxHash={vi.fn()}
        setTransactionId={vi.fn()}
        setSignedMsg={vi.fn()}
        setNodes={vi.fn()}
      />,
    )
  })
})
