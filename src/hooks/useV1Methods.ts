import { useState, useCallback } from 'react'
import {
  AccountId,
  TransferTransaction,
  Hbar,
  Transaction,
  TransactionId,
  Client,
} from '@hashgraph/sdk'
import {
  DAppSigner,
  DAppConnector,
  transactionToBase64String,
} from '@hashgraph/hedera-wallet-connect'
import { decodeSignature, formatSignatureDisplay } from '../utils/signatureVerification'

interface UseV1MethodsState {
  isExecuting: boolean
  error: string | null
  result: unknown
}

export interface ProgressUpdate {
  phase: 'signing' | 'executing'
  nodeIndex?: number
  totalNodes?: number
  status?: 'pending' | 'success' | 'failed'
  duration?: number
  error?: {
    nodeIndex: number
    errorType: string
    errorMessage: string
    stackTrace?: string
  }
}

export function useV1Methods(
  signers: DAppSigner[],
  connector: DAppConnector | null,
  setTransactionId?: (id: string) => void,
  setSignedMsg?: (msg: string) => void,
  setNodes?: (nodes: string[]) => void,
  signedTransaction?: Transaction | null,
  setSignedTransaction?: (tx: Transaction | null) => void,
  onProgress?: (update: ProgressUpdate) => void,
) {
  const [state, setState] = useState<UseV1MethodsState>({
    isExecuting: false,
    error: null,
    result: null,
  })

  const executeV1Method = useCallback(
    async (
      method: string,
      params?: {
        to?: string
        amount?: number
        recipientId?: string
        message?: string
        maxFee?: string
        nodeCount?: string
        executionStrategy?: string
      }
    ) => {
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
        let result: unknown

        switch (method) {
          case 'hedera_getAccountInfo': {
            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const accountInfo = await signer.getAccountInfo()
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
              .addHbarTransfer(accountId.toString(), -params.amount)
              .addHbarTransfer(AccountId.fromString(params.to), params.amount)

            const signedTx = await signer.signTransaction(transaction as Transaction)
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

          case 'hedera_signTransaction': {
            if (!params?.recipientId || !params?.amount || !params?.maxFee) {
              throw new Error('Missing required parameters: recipientId, amount, maxFee')
            }

            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const hbarAmount = new Hbar(Number(params.amount))
            const recipientAccountId = AccountId.fromString(params.recipientId)
            const transaction = new TransferTransaction()
              .setTransactionId(TransactionId.generate(accountId.toString()))
              .addHbarTransfer(accountId.toString(), hbarAmount.negated())
              .addHbarTransfer(recipientAccountId, hbarAmount)
              .setMaxTransactionFee(new Hbar(Number(params.maxFee)))

            const signedTx = await signer.signTransaction(transaction as Transaction)
            console.log('Signed transaction type:', typeof signedTx, signedTx)
            console.log(
              'Has executeWithSigner?',
              typeof (signedTx as Transaction & { executeWithSigner?: unknown })
                ?.executeWithSigner,
            )
            if (setSignedTransaction) {
              setSignedTransaction(signedTx)
            }

            result = {
              success: true,
              message:
                'Transaction signed successfully. Use hedera_executeTransaction to submit.',
              details: {
                from: accountId.toString(),
                to: params.recipientId,
                amount: `${params.amount} HBAR`,
                maxFee: `${params.maxFee} HBAR`,
              },
            }
            return result
          }

          case 'hedera_executeTransaction': {
            console.log(
              'Attempting to execute transaction, signedTransaction:',
              signedTransaction,
            )
            if (!signedTransaction) {
              throw new Error(
                'No signed transaction available. Use hedera_signTransaction first.',
              )
            }

            const txResponse = await (
              signedTransaction as Transaction & {
                executeWithSigner: (
                  signer: DAppSigner,
                ) => Promise<{
                  getReceiptWithSigner: (
                    signer: DAppSigner,
                  ) => Promise<{ status: { toString: () => string } }>
                  transactionId?: { toString: () => string }
                }>
              }
            ).executeWithSigner(signer)
            const receipt = await txResponse.getReceiptWithSigner(signer)

            if (setTransactionId && txResponse.transactionId) {
              setTransactionId(txResponse.transactionId.toString())
            }

            // Clear the signed transaction after execution
            if (setSignedTransaction) {
              setSignedTransaction(null)
            }

            result = {
              transactionId: txResponse.transactionId?.toString(),
              status: receipt.status.toString(),
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

          case 'hedera_signAndExecuteTransaction': {
            if (!params?.recipientId || !params?.amount) {
              throw new Error('Missing required parameters: recipientId, amount')
            }

            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const hbarAmount = new Hbar(Number(params.amount))
            const recipientAccountId = AccountId.fromString(params.recipientId)
            const transaction = new TransferTransaction()
              .setTransactionId(TransactionId.generate(accountId.toString()))
              .addHbarTransfer(accountId.toString(), hbarAmount.negated())
              .addHbarTransfer(recipientAccountId, hbarAmount)
              .setMaxTransactionFee(new Hbar(1)) // Default max fee of 1 HBAR

            // Use the wallet's native signAndExecuteTransaction method
            // This will make a single request to the wallet
            const transactionList = transactionToBase64String(transaction as Transaction)

            // Call the wallet directly through the connector
            if (!connector) {
              throw new Error('Connector not available')
            }

            // Pass the correct params format expected by DAppConnector
            const walletResponse = await connector.signAndExecuteTransaction({
              signerAccountId: accountId.toString(),
              transactionList: transactionList,
            })

            const response = walletResponse as { transactionId?: string }
            if (setTransactionId && response?.transactionId) {
              setTransactionId(response.transactionId)
            }

            result = {
              transactionId: response?.transactionId,
              status: 'SUCCESS',
            }
            return result
          }

          case 'hedera_signTransactions': {            
            if (!params?.to || !params?.amount) {
              throw new Error('Missing required parameters: to and amount')
            }

            const accountId = signer.getAccountId()
            if (!accountId) throw new Error('Account ID not available')

            const nodeCount = Number(params.nodeCount) || 5
            const executionStrategy = params.executionStrategy || 'firstSuccess'
            
            // Create transaction WITHOUT node IDs (required for HIP-1190)
            const transaction = new TransferTransaction()
              .setTransactionId(TransactionId.generate(accountId))
              .addHbarTransfer(accountId.toString(), -Number(params.amount))
              .addHbarTransfer(AccountId.fromString(params.to), Number(params.amount))
              .setMaxTransactionFee(new Hbar(Number(params.maxFee) || 2))

            // Track signing time
            const signStart = performance.now()
            
            onProgress?.({ 
              phase: 'signing', 
              totalNodes: nodeCount 
            })

            // Sign for multiple nodes (HIP-1190)
            const signedTransactions = await signer.signTransactions(
              transaction,
              nodeCount
            )

            const signingDuration = performance.now() - signStart
            
            onProgress?.({ 
              phase: 'signing', 
              duration: signingDuration,
              totalNodes: nodeCount 
            })

            console.log(`Signed transaction for ${signedTransactions.length} nodes in ${signingDuration.toFixed(2)}ms`)

            // Extract all signatures for reporting (matching V2)
            const allSignatures = signedTransactions.map((signedTx, index) => {
              const nodeAccountIds = signedTx.nodeAccountIds || []
              const nodeId = nodeAccountIds.length > 0 ? nodeAccountIds[0].toString() : 'Unknown'
              const signatures = signedTx._signedTransactions.list.map((protoTx) => {
                const sigPairs = protoTx.sigMap?.sigPair || []
                return sigPairs.map((sigPair) => ({
                  publicKeyPrefix: sigPair.pubKeyPrefix ? Buffer.from(sigPair.pubKeyPrefix).toString('hex') : '',
                  signature: sigPair.ed25519 ? Buffer.from(sigPair.ed25519).toString('hex') : 
                             sigPair.ECDSASecp256k1 ? Buffer.from(sigPair.ECDSASecp256k1).toString('hex') : ''
                }))
              }).flat()
              
              return {
                nodeIndex: index,
                nodeId,
                transactionId: signedTx.transactionId?.toString() || '',
                signatures
              }
            })

            // Try each node until one succeeds or execute all nodes (based on strategy)
            const client = Client.forTestnet()
            const attempts: Array<{
              nodeIndex: number
              nodeId: string
              status: 'success' | 'failed'
              duration: number
              transactionId?: string
              error?: {
                errorType: string
                errorMessage: string
                stackTrace?: string
              }
            }> = []

            let firstSuccessIndex = -1
            let firstTransactionId: string | undefined

            for (let i = 0; i < signedTransactions.length; i++) {
              const execStart = performance.now()
              const nodeAccountIds = signedTransactions[i].nodeAccountIds || []
              const nodeId = nodeAccountIds.length > 0 ? nodeAccountIds[0].toString() : 'Unknown'
              
              onProgress?.({
                phase: 'executing',
                nodeIndex: i,
                totalNodes: signedTransactions.length,
                status: 'pending'
              })

              try {
                console.log(`Attempting node ${i + 1}/${signedTransactions.length} (${nodeId})...`)
                
                const response = await signedTransactions[i].execute(client)
                const execDuration = performance.now() - execStart
                const transactionId = response.transactionId.toString()
                
                console.log(`✅ Success on node ${i + 1} in ${execDuration.toFixed(2)}ms, TX ID: ${transactionId}`)
                
                attempts.push({
                  nodeIndex: i,
                  nodeId,
                  status: 'success',
                  duration: execDuration,
                  transactionId
                })

                onProgress?.({
                  phase: 'executing',
                  nodeIndex: i,
                  totalNodes: signedTransactions.length,
                  status: 'success',
                  duration: execDuration
                })

                // Store first success
                if (firstSuccessIndex === -1) {
                  firstSuccessIndex = i
                  firstTransactionId = transactionId
                  if (setTransactionId) {
                    setTransactionId(firstTransactionId)
                  }
                }

                // If strategy is 'firstSuccess', return immediately (HIP-1190 failover)
                if (executionStrategy === 'firstSuccess') {
                  const totalDuration = performance.now() - signStart

                  result = {
                    success: true,
                    transactionId,
                    nodeIndexUsed: i,
                    totalAttempts: i + 1,
                    totalNodes: signedTransactions.length,
                    signingDuration,
                    totalDuration,
                    attempts,
                    allSignatures,
                    executionStrategy: 'firstSuccess',
                    message: `Transaction successful on node ${i + 1}/${signedTransactions.length} (${nodeId}). Stopped at first success.`
                  }
                  
                  return result
                }

                // If strategy is 'allNodes', continue to next node (testing mode)
                
              } catch (error: unknown) {
                const execDuration = performance.now() - execStart
                const errorObj = error instanceof Error ? error : new Error(String(error))
                
                console.error(`❌ Node ${i + 1} (${nodeId}) failed in ${execDuration.toFixed(2)}ms:`, errorObj.message)
                
                const errorDetails = {
                  errorType: errorObj.constructor?.name || 'Error',
                  errorMessage: errorObj.message || 'Unknown error',
                  stackTrace: errorObj.stack
                }

                attempts.push({
                  nodeIndex: i,
                  nodeId,
                  status: 'failed',
                  duration: execDuration,
                  error: errorDetails
                })

                onProgress?.({
                  phase: 'executing',
                  nodeIndex: i,
                  totalNodes: signedTransactions.length,
                  status: 'failed',
                  duration: execDuration,
                  error: {
                    nodeIndex: i,
                    ...errorDetails
                  }
                })

                // For 'firstSuccess' strategy: if this was the last node, throw error
                if (executionStrategy === 'firstSuccess' && i === signedTransactions.length - 1) {
                  const totalDuration = performance.now() - signStart
                  throw new Error(
                    `Transaction failed on all ${signedTransactions.length} nodes. ` +
                    `Last error: ${errorObj.message}. ` +
                    `Total duration: ${totalDuration.toFixed(2)}ms`
                  )
                }
                
                // For 'allNodes' strategy: continue to next node regardless
              }
            }

            // If we reach here with 'allNodes' strategy, return results
            if (executionStrategy === 'allNodes') {
              const totalDuration = performance.now() - signStart
              const successCount = attempts.filter(a => a.status === 'success').length
              const failCount = attempts.filter(a => a.status === 'failed').length

              if (successCount === 0) {
                throw new Error(
                  `All ${signedTransactions.length} nodes failed. ` +
                  `Total duration: ${totalDuration.toFixed(2)}ms`
                )
              }

              result = {
                success: true,
                transactionId: firstTransactionId!,
                nodeIndexUsed: firstSuccessIndex,
                totalAttempts: signedTransactions.length,
                totalNodes: signedTransactions.length,
                signingDuration,
                totalDuration,
                attempts,
                allSignatures,
                executionStrategy: 'allNodes',
                successCount,
                failCount,
                message: `Executed on all ${signedTransactions.length} nodes. Success: ${successCount}, Failed: ${failCount}`
              }
              
              return result
            }

            // Should never reach here, but TypeScript needs a return
            throw new Error('Unexpected error: no nodes were attempted')
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
    [
      signers,
      connector,
      setTransactionId,
      setSignedMsg,
      setNodes,
      signedTransaction,
      setSignedTransaction,
      onProgress,
    ],
  )

  return {
    ...state,
    executeV1Method,
  }
}
