import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { describe, it, beforeEach, expect, vi } from 'vitest'

let activeChain: string
let walletProvider: any
let alertMock: any

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
  const AccountInfo = { fromBytes: () => ({}) }
  class Transaction {}
  return {
    Hbar,
    TransferTransaction,
    TransactionId,
    AccountInfoQuery,
    AccountInfo,
    Transaction,
  }
})

vi.mock('@hashgraph/hedera-wallet-connect', () => ({
  queryToBase64String: () => 'query',
  transactionToBase64String: () => 'tx',
  HederaProvider: { init: vi.fn().mockResolvedValue({}) },
  HederaAdapter: class {},
  HederaChainDefinition: {
    Native: { Mainnet: 'native-mainnet', Testnet: 'native-testnet' },
    EVM: { Mainnet: 'evm-mainnet', Testnet: 'evm-testnet' },
  },
  hederaNamespace: 'hedera',
}))

vi.mock('../../src/components/Modal', async () => {
  const React = await import('react')
  return {
    Modal: ({ isOpen, onSubmit, fields }: any) => {
      React.useEffect(() => {
        if (isOpen) {
          const params: Record<string, string> = {}
          fields.forEach((f: any) => {
            params[f.name] = f.defaultValue || '1'
          })
          onSubmit(params)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [isOpen])
      return null
    },
  }
})

const disconnectMock = vi.fn()

vi.mock('@reown/appkit/react', () => ({
  useDisconnect: () => ({ disconnect: disconnectMock }),
  useAppKitAccount: () => ({ isConnected: true, address: '0xabc' }),
  useAppKitNetworkCore: () => ({ chainId: 1 }),
  useAppKitState: () => ({ activeChain }),
  useAppKitProvider: () => ({ walletProvider }),
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  process.env.VITE_REOWN_PROJECT_ID = 'test'
  activeChain = 'eip155'
  walletProvider = createWalletProviderMock()
  process.env.VITE_REOWN_PROJECT_ID = 'pid'
  alertMock = vi.fn()
  ;(global as any).alert = alertMock
  disconnectMock.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.VITE_REOWN_PROJECT_ID
  ;(global as any).alert = undefined
})

describe('ActionButtonList', () => {
  const props = {
    sendHash: vi.fn(),
    sendTxId: vi.fn(),
    sendSignMsg: vi.fn(),
    sendNodeAddresses: vi.fn(),
    ethTxHash: '0x123',
    setLastFunctionResult: vi.fn(),
    onDisconnect: vi.fn(),
  }

  it('executes all ethereum methods', async () => {
    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    const methods = [
      'eth_signMessage',
      'eth_signTransaction',
      'eth_sendRawTransaction',
      'eth_sendTransaction',
      'eth_signTypedData',
      'eth_getBalance',
      'eth_blockNumber',
      'eth_call',
      'eth_feeHistory',
      'eth_gasPrice',
      'eth_getCode',
      'eth_getBlockByHash',
      'eth_getBlockByNumber',
      'eth_getBlockTransactionCountByHash',
      'eth_getBlockTransactionCountByNumber',
      'eth_getFilterLogs',
      'eth_getFilterChanges',
      'eth_getLogs',
      'eth_getStorageAt',
      'eth_getTransactionByBlockHashAndIndex',
      'eth_getTransactionByBlockNumberAndIndex',
      'eth_getTransactionByHash',
      'eth_getTransactionCount',
      'eth_getTransactionReceipt',
      'eth_maxPriorityFeePerGas',
      'eth_mining',
      'eth_newBlockFilter',
      'eth_newFilter',
      'eth_syncing',
      'eth_uninstallFilter',
      'net_listening',
      'net_version',
      'web3_clientVersion',
      'eth_chainId',
    ]

    for (const m of methods) {
      fireEvent.click(screen.getByText(m))
    }

    await waitFor(() => {
      expect(props.setLastFunctionResult).toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalled()
    })
  })

  it('executes all hedera methods', async () => {
    activeChain = 'hedera'
    walletProvider = createWalletProviderMock()
    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    const methods = [
      'hedera_signTransaction',
      'hedera_executeTransaction',
      'hedera_signAndExecuteTransaction',
      'hedera_signAndExecuteQuery',
      'hedera_getNodeAddresses',
      'hedera_signMessage',
    ]

    for (const m of methods) {
      fireEvent.click(screen.getByText(m))
    }

    await waitFor(() => {
      expect(props.setLastFunctionResult).toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalled()
    })
  })

  it('executes methods without modal configuration directly', async () => {
    activeChain = 'eip155'
    walletProvider = createWalletProviderMock()

    // Mock getMethodConfig to return undefined for a method (no modal needed)
    vi.doMock('../../src/utils/methodConfigs', () => ({
      getMethodConfig: vi.fn().mockReturnValue(undefined),
    }))

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    // Click on a method that doesn't have config (direct execution)
    fireEvent.click(screen.getByText('eth_chainId'))

    await waitFor(() => {
      expect(props.setLastFunctionResult).toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalled()
    })
  })

  it('handles method execution errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    activeChain = 'eip155'
    // Create a provider that throws errors
    const errorProvider = createWalletProviderMock()
    errorProvider.rpcProviders.eip155.httpProviders[1].request = vi
      .fn()
      .mockRejectedValue(new Error('Test error'))
    walletProvider = errorProvider

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    // Click on a method that will cause an error
    fireEvent.click(screen.getByText('eth_chainId'))

    await waitFor(() => {
      expect(props.setLastFunctionResult).toHaveBeenCalledWith({
        functionName: 'eth_chainId',
        result: 'Error: Test error',
      })
      expect(alertMock).toHaveBeenCalledWith('Error: Test error')
    })

    consoleSpy.mockRestore()
  })

  it('handles disconnect errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    disconnectMock.mockRejectedValueOnce(new Error('Disconnect failed'))

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    // Click the disconnect button
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))

    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to disconnect:', expect.any(Error))
      // onDisconnect should NOT be called when disconnect fails
      expect(props.onDisconnect).not.toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('handles successful disconnect', async () => {
    disconnectMock.mockResolvedValueOnce(undefined)

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    // Click the disconnect button
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))

    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalled()
      expect(props.onDisconnect).toHaveBeenCalled()
    })
  })

  it('handles object results in alerts', async () => {
    // Mock a method that returns an object result
    walletProvider.rpcProviders.eip155.httpProviders[1].request = vi
      .fn()
      .mockResolvedValue({ status: 1, data: 'test' })

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    fireEvent.click(screen.getByText('eth_chainId'))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('{"status":1,"data":"test"}')
      expect(props.setLastFunctionResult).toHaveBeenCalledWith({
        functionName: 'eth_chainId',
        result: '{"status":1,"data":"test"}',
      })
    })
  })

  it('handles null/undefined results', async () => {
    // Mock a method that returns null
    const nullProvider = createWalletProviderMock()
    nullProvider.rpcProviders.eip155.httpProviders[1].request = vi.fn().mockResolvedValue(null)
    walletProvider = nullProvider

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    fireEvent.click(screen.getByText('eth_chainId'))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('null')
      expect(props.setLastFunctionResult).toHaveBeenCalledWith({
        functionName: 'eth_chainId',
        result: 'null',
      })
    })
  })

  it('handles undefined results', async () => {
    // Mock a method that returns undefined
    const undefinedProvider = createWalletProviderMock()
    undefinedProvider.rpcProviders.eip155.httpProviders[1].request = vi
      .fn()
      .mockResolvedValue(undefined)
    walletProvider = undefinedProvider

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    fireEvent.click(screen.getByText('eth_chainId'))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('')
      expect(props.setLastFunctionResult).toHaveBeenCalledWith({
        functionName: 'eth_chainId',
        result: '',
      })
    })
  })

  it('works without window alert', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock an error provider that will cause the error path to execute
    const errorProvider = createWalletProviderMock()
    errorProvider.rpcProviders.eip155.httpProviders[1].request = vi
      .fn()
      .mockRejectedValue(new Error('Test error'))
    walletProvider = errorProvider

    // Mock window.alert as undefined to test the window check
    const originalAlert = window.alert
    Object.defineProperty(window, 'alert', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    fireEvent.click(screen.getByText('eth_chainId'))

    await waitFor(() => {
      expect(props.setLastFunctionResult).toHaveBeenCalledWith({
        functionName: 'eth_chainId',
        result: 'Error: Test error',
      })
    })

    // Restore alert
    Object.defineProperty(window, 'alert', {
      value: originalAlert,
      writable: true,
      configurable: true,
    })

    consoleSpy.mockRestore()
  })

  it('handles disconnected state', async () => {
    vi.doMock('@reown/appkit/react', () => ({
      useDisconnect: () => ({ disconnect: disconnectMock }),
      useAppKitAccount: () => ({ isConnected: false, address: undefined }),
      useAppKitNetworkCore: () => ({ chainId: undefined }),
      useAppKitState: () => ({ activeChain: null }),
      useAppKitProvider: () => ({ walletProvider: undefined }),
    }))

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...props} />)

    // Should still render buttons
    expect(screen.getByText('eth_chainId')).toBeInTheDocument()
  })

  it('handles successful disconnect without onDisconnect callback', async () => {
    // Reset modules to ensure proper mocking
    vi.resetModules()

    // Mock as connected to show disconnect button
    vi.doMock('@reown/appkit/react', () => ({
      useDisconnect: () => ({ disconnect: disconnectMock }),
      useAppKitAccount: () => ({ isConnected: true, address: '0xabc' }),
      useAppKitNetworkCore: () => ({ chainId: 1 }),
      useAppKitState: () => ({ activeChain: 'eip155' }),
      useAppKitProvider: () => ({ walletProvider: createWalletProviderMock() }),
    }))

    disconnectMock.mockResolvedValueOnce(undefined)

    const propsWithoutOnDisconnect = {
      sendHash: vi.fn(),
      sendTxId: vi.fn(),
      sendSignMsg: vi.fn(),
      sendNodeAddresses: vi.fn(),
      ethTxHash: '0x123',
      setLastFunctionResult: vi.fn(),
      // onDisconnect is not provided
    }

    const { ActionButtonList } = await import('../../src/components/ActionButtonList')
    render(<ActionButtonList {...propsWithoutOnDisconnect} />)

    // Click the disconnect button
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))

    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalled()
      // Should not throw error when onDisconnect is not provided
    })
  })
})
