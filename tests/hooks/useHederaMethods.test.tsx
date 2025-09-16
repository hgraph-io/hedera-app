import React, { useEffect } from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, beforeEach, expect, vi } from 'vitest'
import { useHederaMethods } from '../../src/hooks/useHederaMethods'

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
}))

describe('useHederaMethods', () => {
  let walletProvider: any
  let sendTxId: any
  let sendSignMsg: any
  let sendNodeAddresses: any
  let execute: any

  function setup() {
    function Wrapper({ onReady }: any) {
      const { executeHederaMethod } = useHederaMethods(
        walletProvider,
        '0.0.1234',
        sendTxId,
        sendSignMsg,
        sendNodeAddresses,
      )
      useEffect(() => {
        onReady(executeHederaMethod)
      }, [executeHederaMethod, onReady])
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

  beforeEach(() => {
    sendTxId = vi.fn()
    sendSignMsg = vi.fn()
    sendNodeAddresses = vi.fn()
    walletProvider = {
      hedera_executeTransaction: vi.fn(async () => ({ transactionId: 'tid' })),
      hedera_signAndExecuteTransaction: vi.fn(async () => ({ transactionId: 'tid' })),
      hedera_signTransaction: vi.fn(async () => ({ tx: true })),
      hedera_signAndExecuteQuery: vi.fn(async () => ({
        response: Buffer.from('data').toString('base64'),
      })),
      hedera_getNodeAddresses: vi.fn(async () => ({ nodes: ['n1'] })),
      hedera_signMessage: vi.fn(async () => ({ signatureMap: 'sig' })),
    }
    setup()
  })

  it('signs then executes a transaction', async () => {
    await act(async () => {
      const res = await execute('hedera_signTransaction', {
        recipientId: '0.0.1',
        amount: '1',
        maxFee: '1',
      })
      expect(res).toBe('Transaction signed successfully')
    })
    await act(async () => {
      const id = await execute('hedera_executeTransaction', {})
      expect(id).toBe('tid')
    })
    expect(sendTxId).toHaveBeenCalledWith('tid')
  })

  it('handles other methods', async () => {
    await act(async () => {
      const res = await execute('hedera_getNodeAddresses', {})
      expect(res).toEqual(['n1'])
    })
    await act(async () => {
      const msg = await execute('hedera_signMessage', { message: 'm' })
      expect(msg).toEqual({
        signatureMap: 'sig',
        formatted: 'sig',
        details: ['Message: "m"'],
      })
    })
    await act(async () => {
      const q = await execute('hedera_signAndExecuteQuery', {})
      expect(q).toBe(JSON.stringify({ info: 'data' }))
    })
  })

  it('signs and executes transaction in one call', async () => {
    await act(async () => {
      const res = await execute('hedera_signAndExecuteTransaction', {
        recipientId: '0.0.1',
        amount: '1',
      })
      expect(res).toBe('tid')
    })
    expect(sendTxId).toHaveBeenCalledWith('tid')
    expect(walletProvider.hedera_signAndExecuteTransaction).toHaveBeenCalledWith({
      signerAccountId: 'hedera:testnet:0.0.1234',
      transactionList: 'tx',
    })
  })

  it('throws for unsupported method', async () => {
    await expect(execute('unknown', {})).rejects.toThrow('Unsupported Hedera method')
  })

  it('throws when executing transaction without signing first', async () => {
    await expect(execute('hedera_executeTransaction', {})).rejects.toThrow(
      'Transaction not signed, use hedera_signTransaction first',
    )
  })
})
