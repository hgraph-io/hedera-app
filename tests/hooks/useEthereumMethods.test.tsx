import React, { useEffect } from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'

vi.mock('ethers', () => {
  class BrowserProvider {
    constructor(_: any, __: any) {}
  }
  class JsonRpcProvider {
    constructor(_: any) {}
  }
  class JsonRpcSigner {
    constructor(_: any, __: any) {}
    async sendTransaction() {
      return { hash: 'rawHash' }
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
    async _signMessage() {
      return 'signature'
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
    toQuantity: (v: any) => v,
  }
})

const sendMock = vi.fn(async () => '0x5')
vi.mock('../../src/config', () => ({
  jsonRpcProvider: { send: sendMock },
}))

describe('useEthereumMethods', () => {
  let rpcProvider: any
  let walletProvider: any
  let sendHash: any
  let sendSignMsg: any
  let execute: any
  let useEthereumMethods: any

  async function setup() {
    const mod = await import('../../src/hooks/useEthereumMethods')
    useEthereumMethods = mod.useEthereumMethods
    function Wrapper({ onReady }: any) {
      const { executeEthMethod } = useEthereumMethods({
        walletProvider,
        chainId: 1,
        address: '0xabc',
        ethTxHash: '0x123',
        sendHash,
        sendSignMsg,
      })
      useEffect(() => {
        onReady(executeEthMethod)
      }, [executeEthMethod, onReady])
      return null
    }
    render(
      <Wrapper
        onReady={(fn: any) => {
          execute = fn
        }}
      />,
    )
  }

  beforeEach(async () => {
    process.env.VITE_REOWN_PROJECT_ID = 'pid'
    sendHash = vi.fn()
    sendSignMsg = vi.fn()
    sendMock.mockClear()
    rpcProvider = {
      request: vi.fn(async ({ method }: any) => {
        switch (method) {
          case 'eth_getBalance':
            return '0x5'
          case 'eth_chainId':
            return '0x1'
          case 'eth_blockNumber':
            return '0x5'
          case 'eth_sendRawTransaction':
            return 'rawHash'
          case 'eth_getTransactionByHash':
            return undefined
          case 'eth_getTransactionReceipt':
            return undefined
          default:
            return '0x1'
        }
      }),
    }
    walletProvider = {
      rpcProviders: { eip155: { httpProviders: { 1: rpcProvider } } },
      request: vi.fn(async () => 'signature'),
    }
    await setup()
  })

  afterEach(() => {
    delete process.env.VITE_REOWN_PROJECT_ID
  })

  it('signs and sends a transaction', async () => {
    await act(async () => {
      await execute('eth_signTransaction', { to: '0x1', value: '1', gasLimit: '1' })
    })
    await act(async () => {
      const res = await execute('eth_sendRawTransaction', {})
      expect(res).toBe('rawHash')
    })
    expect(sendHash).toHaveBeenCalledWith('rawHash')
  })

  it('sends a transaction directly', async () => {
    await act(async () => {
      const res = await execute('eth_sendTransaction', { to: '0x1', value: '1', gasLimit: '1' })
      expect(res).toBe('rawHash')
    })
    expect(sendHash).toHaveBeenCalledWith('rawHash')
  })

  it('returns balance and handles missing tx', async () => {
    let balance: any
    await act(async () => {
      balance = await execute('eth_getBalance', { address: '0xabc' })
    })
    expect(balance).toBe('5')

    await act(async () => {
      const tx = await execute('eth_getTransactionByHash', { hash: '0x1' })
      expect(tx).toBe('Transaction not found')
    })

    await act(async () => {
      const rc = await execute('eth_getTransactionReceipt', { hash: '0x1' })
      expect(rc).toBe('Receipt not found')
    })
  })

  it('handles found transactions and receipts', async () => {
    rpcProvider.request = vi.fn(async ({ method }: any) => {
      switch (method) {
        case 'eth_getTransactionByHash':
          return { hash: '0x123', value: '0x1' }
        case 'eth_getTransactionReceipt':
          return { status: 1, transactionHash: '0x123' }
        default:
          return '0x1'
      }
    })

    await act(async () => {
      const tx = await execute('eth_getTransactionByHash', { hash: '0x1' })
      expect(JSON.parse(tx)).toEqual({ hash: '0x123', value: '0x1' })
    })

    await act(async () => {
      const receipt = await execute('eth_getTransactionReceipt', { hash: '0x1' })
      expect(JSON.parse(receipt)).toEqual({ status: 1, transactionHash: '0x123' })
    })
  })

  it('uses ethTxHash fallback when hash not provided', async () => {
    rpcProvider.request = vi.fn(async ({ method, params }: any) => {
      if (method === 'eth_getTransactionByHash' && params[0] === '0x123') {
        return { hash: '0x123', from: '0xabc' }
      }
      if (method === 'eth_getTransactionReceipt' && params[0] === '0x123') {
        return { status: 1, hash: '0x123' }
      }
      return null
    })

    await act(async () => {
      // Test without providing hash - should use ethTxHash
      const tx = await execute('eth_getTransactionByHash', {})
      expect(JSON.parse(tx)).toEqual({ hash: '0x123', from: '0xabc' })
    })

    await act(async () => {
      // Test without providing hash - should use ethTxHash
      const receipt = await execute('eth_getTransactionReceipt', {})
      expect(JSON.parse(receipt)).toEqual({ status: 1, hash: '0x123' })
    })
  })

  it('throws on unsupported method', async () => {
    await expect(execute('unknown', {})).rejects.toThrow('Unsupported Ethereum method')
  })

  it('executes various methods', async () => {
    const methods = [
      'eth_chainId',
      'eth_blockNumber',
      'eth_feeHistory',
      'eth_gasPrice',
      'eth_call',
      'eth_getCode',
      'eth_getStorageAt',
      'eth_getTransactionCount',
      'eth_maxPriorityFeePerGas',
      'eth_getBlockByHash',
      'eth_getBlockByNumber',
      'eth_getBlockTransactionCountByHash',
      'eth_getBlockTransactionCountByNumber',
      'eth_getFilterLogs',
      'eth_getFilterChanges',
      'eth_getTransactionByBlockHashAndIndex',
      'eth_getTransactionByBlockNumberAndIndex',
      'eth_getLogs',
      'eth_mining',
      'eth_newBlockFilter',
      'eth_newFilter',
      'eth_syncing',
      'eth_uninstallFilter',
      'net_listening',
      'net_version',
      'web3_clientVersion',
    ]
    for (const name of methods) {
      await act(async () => {
        await execute(name, {
          address: '0x1',
          blockTag: 'latest',
          blockHash: 'b',
          index: '0',
          fromBlock: '0x1',
          toBlock: '0x2',
          filterId: '1',
          blockNumber: '0x1',
          data: '0x',
          message: 'm',
          to: '0x1',
          gasLimit: '1',
          value: '1',
          domain: 'd',
          version: '1',
          verifyingContract: '0x1',
          from_name: 'a',
          from_wallet: '0x1',
          to_name: 'b',
          to_wallet: '0x2',
          contents: 'c',
        })
      })
    }
  })

  it.skip('handles missing signer and signed tx', async () => {
    const mod = await import('../../src/hooks/useEthereumMethods')
    let execFn: any
    function Wrapper({ onReady }: any) {
      const { executeEthMethod } = mod.useEthereumMethods({
        walletProvider: undefined,
        chainId: undefined,
        address: undefined,
        ethTxHash: '0x0',
        sendHash,
        sendSignMsg,
      })
      useEffect(() => {
        onReady(executeEthMethod)
      }, [executeEthMethod, onReady])
      return null
    }
    render(
      <Wrapper
        onReady={(fn: any) => {
          execFn = fn
        }}
      />,
    )
    await expect(
      execFn('eth_sendTransaction', { to: '0x1', value: '1', gasLimit: '1' }),
    ).rejects.toThrow('Wallet not connected')
    await expect(execFn('eth_sendRawTransaction', {})).rejects.toThrow('Transaction not signed')
  })

  it.skip('uses fallback jsonRpc provider', async () => {
    const mod = await import('../../src/hooks/useEthereumMethods')
    let execFn: any
    function Wrapper({ onReady }: any) {
      const { executeEthMethod } = mod.useEthereumMethods({
        walletProvider: undefined,
        chainId: undefined,
        address: '0xabc',
        ethTxHash: '0x0',
        sendHash,
        sendSignMsg,
      })
      useEffect(() => {
        onReady(executeEthMethod)
      }, [executeEthMethod, onReady])
      return null
    }
    render(
      <Wrapper
        onReady={(fn: any) => {
          execFn = fn
        }}
      />,
    )
    await act(async () => {
      const res = await execFn('eth_getBalance', { address: '0xabc' })
      expect(res).toBe('5')
    })
    expect(sendMock).toHaveBeenCalledWith('eth_getBalance', ['0xabc', 'latest'])
  })

  it('signs messages with personal_sign', async () => {
    await act(async () => {
      const sig = await execute('personal_sign', { message: 'test message' })
      expect(sig).toBe('signature')
      expect(sendSignMsg).toHaveBeenCalledWith('signature')
    })
  })

  it('throws error for unsupported eth_sign method', async () => {
    await expect(execute('eth_sign', { message: 'test message' })).rejects.toThrow(
      'eth_sign is not supported. This legacy method is deprecated due to security concerns. Please use personal_sign or eth_signTypedData_v4 instead.',
    )
  })

  it('signs typed data v3', async () => {
    await act(async () => {
      const sig = await execute('eth_signTypedData_v3', {
        domain: 'test',
        version: '1',
        verifyingContract: '0x1',
        from_name: 'Alice',
        from_wallet: '0x2',
        to_name: 'Bob',
        to_wallet: '0x3',
        contents: 'Hello',
      })
      expect(sig).toBe('typedSignature')
      expect(sendSignMsg).toHaveBeenCalledWith('typedSignature')
    })
  })

  it('signs typed data v4', async () => {
    await act(async () => {
      const sig = await execute('eth_signTypedData_v4', {
        domain: 'test',
        version: '1',
        verifyingContract: '0x1',
        from_name: 'Alice',
        from_wallet: '0x2',
        to_name: 'Bob',
        to_wallet: '0x3',
        contents: 'Hello',
      })
      expect(sig).toBe('typedSignature')
      expect(sendSignMsg).toHaveBeenCalledWith('typedSignature')
    })
  })

  it('returns empty array for eth_accounts', async () => {
    await act(async () => {
      const accounts = await execute('eth_accounts', {})
      expect(accounts).toEqual([])
    })
  })

  it('handles eth_feeHistory with blockCount param', async () => {
    await act(async () => {
      const result = await execute('eth_feeHistory', {
        blockCount: '10',
        newestBlock: 'latest',
      })
      expect(JSON.parse(result)).toBe('0x1')
    })
  })

  it.skip('throws when signer missing for typed data methods', async () => {
    const mod = await import('../../src/hooks/useEthereumMethods')
    let execFn: any
    function Wrapper({ onReady }: any) {
      const { executeEthMethod } = mod.useEthereumMethods({
        walletProvider: undefined,
        chainId: undefined,
        address: undefined,
        ethTxHash: '0x0',
        sendHash,
        sendSignMsg,
      })
      useEffect(() => {
        onReady(executeEthMethod)
      }, [executeEthMethod, onReady])
      return null
    }
    render(
      <Wrapper
        onReady={(fn: any) => {
          execFn = fn
        }}
      />,
    )

    await expect(
      execFn('eth_signTypedData_v3', {
        domain: 'test',
        version: '1',
        verifyingContract: '0x1',
        from_name: 'Alice',
        from_wallet: '0x2',
        to_name: 'Bob',
        to_wallet: '0x3',
        contents: 'Hello',
      }),
    ).rejects.toThrow('Wallet not connected')

    await expect(
      execFn('eth_signTypedData_v4', {
        domain: 'test',
        version: '1',
        verifyingContract: '0x1',
        from_name: 'Alice',
        from_wallet: '0x2',
        to_name: 'Bob',
        to_wallet: '0x3',
        contents: 'Hello',
      }),
    ).rejects.toThrow('Wallet not connected')
  })

  it.skip('throws when signer missing for signing methods', async () => {
    const mod = await import('../../src/hooks/useEthereumMethods')
    let execFn: any
    function Wrapper({ onReady }: any) {
      const { executeEthMethod } = mod.useEthereumMethods({
        walletProvider: undefined,
        chainId: undefined,
        address: undefined,
        ethTxHash: '0x0',
        sendHash,
        sendSignMsg,
      })
      useEffect(() => {
        onReady(executeEthMethod)
      }, [executeEthMethod, onReady])
      return null
    }
    render(
      <Wrapper
        onReady={(fn: any) => {
          execFn = fn
        }}
      />,
    )

    await expect(
      execFn('eth_signTransaction', {
        to: '0x1',
        value: '1',
        gasLimit: '21000',
      }),
    ).rejects.toThrow('Wallet not connected')

    await expect(
      execFn('eth_signMessage', {
        message: 'test message',
      }),
    ).rejects.toThrow('Wallet not connected')

    await expect(
      execFn('personal_sign', {
        message: 'test message',
      }),
    ).rejects.toThrow('Wallet not connected')

    await expect(
      execFn('eth_sign', {
        message: 'test message',
      }),
    ).rejects.toThrow('Wallet not connected')
  })

  it('handles null block responses', async () => {
    // Mock provider that returns null for block queries
    rpcProvider.request = vi.fn(async ({ method }: any) => {
      switch (method) {
        case 'eth_getBlockByHash':
        case 'eth_getBlockByNumber':
          return null
        default:
          return '0x1'
      }
    })

    await act(async () => {
      const blockByHash = await execute('eth_getBlockByHash', {
        blockHash: '0x123',
        includeTransactions: 'false',
      })
      expect(blockByHash).toBe('Block not found')

      const blockByNumber = await execute('eth_getBlockByNumber', {
        blockTag: 'latest',
        includeTransactions: 'false',
      })
      expect(blockByNumber).toBe('Block not found')
    })
  })

  it('handles eth_getBlockByNumber with includeTransactions', async () => {
    rpcProvider.request = vi.fn(async () => ({ number: '0x1', transactions: [] }))

    await act(async () => {
      const result = await execute('eth_getBlockByNumber', {
        blockTag: 'latest',
        includeTransactions: 'true',
      })
      expect(result).toEqual({ number: '0x1', transactions: [] })
    })

    expect(rpcProvider.request).toHaveBeenCalledWith({
      method: 'eth_getBlockByNumber',
      params: ['latest', true],
    })
  })

  it('handles null transaction receipt', async () => {
    rpcProvider.request = vi.fn(async ({ method }: any) => {
      if (method === 'eth_getTransactionReceipt') return null
      return '0x1'
    })

    await act(async () => {
      const receipt = await execute('eth_getTransactionReceipt', { hash: '0x123' })
      expect(receipt).toBe('Receipt not found')
    })
  })

  it.skip('throws when signer missing for eth_signTypedData', async () => {
    const mod = await import('../../src/hooks/useEthereumMethods')
    let execFn: any
    function Wrapper({ onReady }: any) {
      const { executeEthMethod } = mod.useEthereumMethods({
        walletProvider: undefined,
        chainId: undefined,
        address: undefined,
        ethTxHash: '0x0',
        sendHash,
        sendSignMsg,
      })
      useEffect(() => {
        onReady(executeEthMethod)
      }, [executeEthMethod, onReady])
      return null
    }
    render(
      <Wrapper
        onReady={(fn: any) => {
          execFn = fn
        }}
      />,
    )

    await expect(
      execFn('eth_signTypedData', {
        domain: 'test',
        version: '1',
        verifyingContract: '0x1',
        from_name: 'Alice',
        from_wallet: '0x2',
        to_name: 'Bob',
        to_wallet: '0x3',
        contents: 'Hello',
      }),
    ).rejects.toThrow('Wallet not connected')
  })
})
