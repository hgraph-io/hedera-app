import { useState, useCallback } from 'react'
import { AccountId, TransferTransaction } from '@hashgraph/sdk'
import { DAppSigner } from '@hashgraph/hedera-wallet-connect'
import { decodeSignature, formatSignatureDisplay } from '../utils/signatureVerification'

interface UseV1MethodsState {
  isExecuting: boolean
  error: string | null
  result: any
}

export function useV1Methods(
  signers: DAppSigner[],
  setTransactionId?: (id: string) => void,
  setSignedMsg?: (msg: string) => void,
  setNodes?: (nodes: string[]) => void,
) {
  const [state, setState] = useState<UseV1MethodsState>({
    isExecuting: false,
    error: null,
    result: null,
  })

  const executeV1Method = useCallback(
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
          case 'hedera_getAccountInfo': {
            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const accountInfo = await signer.getLedgerClient().getAccountInfo(accountId)
            result = {
              accountId: accountInfo.accountId.toString(),
              balance: accountInfo.balance.toString(),
              publicKey: accountInfo.key?.toString() || 'N/A',
            }
            return result
          }

          case 'hedera_getAccountBalance': {
            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const balance = await signer.getAccountBalance()
            result = {
              accountId: accountId.toString(),
              balance: balance.toString(),
            }
            return result
          }

          case 'hedera_transferHBAR': {
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

            if (setTransactionId && txResponse.transactionId) {
              setTransactionId(txResponse.transactionId.toString())
            }

            result = {
              transactionId: txResponse.transactionId?.toString(),
              status: receipt.status.toString(),
            }
            return result
          }

          case 'hedera_signMessage': {
            if (!params?.message) {
              throw new Error('Missing required parameter: message')
            }

            // Convert message to Uint8Array and wrap in array as expected by sign method
            const messageBytes = Buffer.from(params.message)
            const signatures = await signer.sign([messageBytes])

            // Extract the signature from the first SignerSignature object
            const signatureHex = signatures[0]?.signature
              ? Buffer.from(signatures[0].signature).toString('hex')
              : ''

            // Decode and format the signature for display
            const { display, details } = formatSignatureDisplay(signatureHex, params.message)

            console.log('V1 Signature Details:', {
              message: params.message,
              signatureHex,
              decoded: decodeSignature(signatureHex),
              display,
              details,
            })

            if (setSignedMsg) {
              // Send formatted display with details
              const formattedOutput = [display, ...details].join('\n')
              setSignedMsg(formattedOutput)
            }

            result = {
              signature: signatureHex,
              message: params.message,
              formatted: display,
              details,
            }
            return result
          }

          case 'hedera_getNodeAddresses': {
            // For V1, we'll return some default testnet nodes
            const nodeAddresses = [
              '0.testnet.hedera.com:50211',
              '1.testnet.hedera.com:50211',
              '2.testnet.hedera.com:50211',
            ]
            if (setNodes) {
              setNodes(nodeAddresses)
            }
            return nodeAddresses
          }

          default:
            throw new Error(`Unsupported method: ${method}`)
        }
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
    executeV1Method,
  }
}
