import { useState, useCallback } from 'react'
import { AccountId, AccountInfo, TransferTransaction, TransactionReceipt } from '@hashgraph/sdk'
import { DAppSigner } from '@hashgraph/hedera-wallet-connect'

interface UseV1MethodsState {
  isExecuting: boolean
  error: string | null
  result: any
}

export function useV1Methods(signers: DAppSigner[]) {
  const [state, setState] = useState<UseV1MethodsState>({
    isExecuting: false,
    error: null,
    result: null,
  })

  const executeMethod = useCallback(
    async (method: string, params?: any) => {
      if (!signers || signers.length === 0) {
        setState((prev) => ({
          ...prev,
          error: 'No signer available. Please connect a wallet first.',
        }))
        return null
      }

      setState({ isExecuting: true, error: null, result: null })

      try {
        const signer = signers[0]
        let result: any

        switch (method) {
          case 'getAccountInfo': {
            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const accountInfo = await signer.getLedgerClient().getAccountInfo(accountId)
            result = {
              accountId: accountInfo.accountId.toString(),
              balance: accountInfo.balance.toString(),
              publicKey: accountInfo.key?.toString() || 'N/A',
            }
            break
          }

          case 'getAccountBalance': {
            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const balance = await signer.getAccountBalance()
            result = {
              accountId: accountId.toString(),
              balance: balance.toString(),
            }
            break
          }

          case 'transferHbar': {
            if (!params?.to || !params?.amount) {
              throw new Error('Missing required parameters: to and amount')
            }

            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const transaction = new TransferTransaction()
              .addHbarTransfer(accountId, -params.amount)
              .addHbarTransfer(AccountId.fromString(params.to), params.amount)

            const signedTx = await signer.signTransaction(transaction)
            const txResponse = await signedTx.executeWithSigner(signer)
            const receipt = await txResponse.getReceiptWithSigner(signer)

            result = {
              transactionId: txResponse.transactionId?.toString(),
              status: receipt.status.toString(),
            }
            break
          }

          case 'signMessage': {
            if (!params?.message) {
              throw new Error('Missing required parameter: message')
            }

            const signature = await signer.sign(Buffer.from(params.message))
            result = {
              signature: Buffer.from(signature).toString('hex'),
              message: params.message,
            }
            break
          }

          default:
            throw new Error(`Unsupported method: ${method}`)
        }

        setState({ isExecuting: false, error: null, result })
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setState({ isExecuting: false, error: errorMessage, result: null })
        console.error(`Failed to execute ${method}:`, error)
        return null
      }
    },
    [signers],
  )

  return {
    ...state,
    executeMethod,
  }
}

