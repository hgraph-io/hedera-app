import { useState } from 'react'
import {
  AccountId,
  AccountInfo,
  AccountInfoQuery,
  Client,
  Hbar,
  Transaction as HederaTransaction,
  Query,
  TransactionId,
  TransferTransaction,
} from '@hashgraph/sdk'
import {
  DAppSigner,
  HederaProvider,
  queryToBase64String,
  SignAndExecuteQueryParams,
  SignMessageParams,
  transactionToBase64String,
} from '@hashgraph/hedera-wallet-connect'
import { decodeSignature, formatSignatureDisplay } from '../utils/signatureVerification'

export interface HederaSignTransactionParams {
  recipientId: string
  amount: string
  maxFee: string
}
export interface HederaSignTransactionsParams {
  to: string
  amount: string
  maxFee: string
  nodeCount: string
  executionStrategy: string  // 'firstSuccess' or 'allNodes'
}
export interface HederaSignAndExecuteTransactionParams {
  recipientId: string
  amount: string
}
export interface HederaSignMessageParams {
  message: string
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

export const useHederaMethods = (
  walletProvider: HederaProvider,
  address: string,
  sendTxId: (id: string) => void,
  sendSignMsg: (msg: string) => void,
  sendNodeAddresses: (nodes: string[]) => void,
  onProgress?: (update: ProgressUpdate) => void,
  signer?: DAppSigner,
) => {
  const [signedHederaTx, setSignedHederaTx] = useState<HederaTransaction>()

  const execute = async (methodName: string, params: Record<string, string>) => {
    switch (methodName) {
      case 'hedera_getNodeAddresses': {
        const result = await walletProvider.hedera_getNodeAddresses()
        sendNodeAddresses(result.nodes)
        return result.nodes
      }
      case 'hedera_executeTransaction': {
        if (!signedHederaTx)
          throw Error('Transaction not signed, use hedera_signTransaction first')
        const transactionList = transactionToBase64String(signedHederaTx as HederaTransaction)
        const result = await walletProvider.hedera_executeTransaction({ transactionList })
        setSignedHederaTx(undefined)
        sendTxId(result.transactionId)
        return result.transactionId
      }
      case 'hedera_signMessage': {
        const p = params as unknown as HederaSignMessageParams
        const signParams: SignMessageParams = {
          signerAccountId: 'hedera:testnet:' + address,
          message: p.message,
        }
        const { signatureMap } = await walletProvider.hedera_signMessage(signParams)

        // Decode and format the signature for display
        const { display, details } = formatSignatureDisplay(signatureMap, p.message)

        console.log('V2 Signature Details:', {
          message: p.message,
          signatureMap,
          decoded: decodeSignature(signatureMap),
          display,
          details,
        })

        // Send formatted display with details
        const formattedOutput = [display, ...details].join('\n')
        sendSignMsg(formattedOutput)

        return {
          signatureMap,
          formatted: display,
          details,
        }
      }
      case 'hedera_signTransaction': {
        const p = params as unknown as HederaSignTransactionParams
        const accountId = address
        const hbarAmount = new Hbar(Number(p.amount))
        const transaction = new TransferTransaction()
          .setTransactionId(TransactionId.generate(accountId))
          .addHbarTransfer(accountId, hbarAmount.negated())
          .addHbarTransfer(p.recipientId, hbarAmount)
          .setMaxTransactionFee(new Hbar(Number(p.maxFee)))
        const transactionSigned = await walletProvider.hedera_signTransaction({
          signerAccountId: 'hedera:testnet:' + accountId,
          transactionBody: transaction as HederaTransaction,
        })
        setSignedHederaTx(transactionSigned as unknown as HederaTransaction)
        return 'Transaction signed successfully'
      }
      case 'hedera_signAndExecuteTransaction': {
        const p = params as unknown as HederaSignAndExecuteTransactionParams
        const accountId = address
        const hbarAmount = new Hbar(Number(p.amount))
        const transaction = new TransferTransaction()
          .setTransactionId(TransactionId.generate(accountId))
          .addHbarTransfer(accountId, hbarAmount.negated())
          .addHbarTransfer(p.recipientId, hbarAmount)
        const result = await walletProvider.hedera_signAndExecuteTransaction({
          signerAccountId: 'hedera:testnet:' + accountId,
          transactionList: transactionToBase64String(transaction as HederaTransaction),
        })
        sendTxId(result.transactionId)
        return result.transactionId
      }
      case 'hedera_signAndExecuteQuery': {
        const accountId = address
        const query = new AccountInfoQuery().setAccountId(accountId)
        const queryParams: SignAndExecuteQueryParams = {
          signerAccountId: 'hedera:testnet:' + accountId,
          query: queryToBase64String(query as Query<AccountInfo>),
        }
        const { response } = await walletProvider.hedera_signAndExecuteQuery(queryParams)
        const accountInfo = AccountInfo.fromBytes(Buffer.from(response, 'base64'))
        return JSON.stringify(accountInfo)
      }
      case 'hedera_signTransactions': {
        const p = params as unknown as HederaSignTransactionsParams
        const accountId = address
        
        console.log('[HIP-1190] Raw params:', params)
        console.log('[HIP-1190] p.nodeCount:', p.nodeCount, 'type:', typeof p.nodeCount)
        console.log('[HIP-1190] p.executionStrategy:', p.executionStrategy)
        
        const nodeCount = Number(p.nodeCount) || 5
        const executionStrategy = p.executionStrategy || 'firstSuccess'
        
        console.log('[HIP-1190] Parsed nodeCount:', nodeCount)
        console.log('[HIP-1190] Execution strategy:', executionStrategy)
        console.log('[HIP-1190] Requesting signatures for', nodeCount, 'nodes')

        // Create transaction WITHOUT node IDs (required for HIP-1190)
        const transaction = new TransferTransaction()
          .setTransactionId(TransactionId.generate(accountId))
          .addHbarTransfer(accountId, new Hbar(-Number(p.amount)))
          .addHbarTransfer(AccountId.fromString(p.to), new Hbar(Number(p.amount)))
          .setMaxTransactionFee(new Hbar(Number(p.maxFee) || 2))

        // PHASE 1: SIGNING
        const signStart = performance.now()
        
        onProgress?.({ 
          phase: 'signing', 
          totalNodes: nodeCount 
        })

        // Sign for multiple nodes (HIP-1190)
        if (!signer) {
          throw new Error('DAppSigner is required for hedera_signTransactions')
        }

        const signedTransactions = await signer.signTransactions(transaction, nodeCount)

        const signingDuration = performance.now() - signStart
        
        console.log(`✅ Signed transaction for ${signedTransactions.length} nodes in ${signingDuration.toFixed(2)}ms`)

        // Extract all signatures for reporting
        const allSignatures = signedTransactions.map((signedTx, index) => {
          const nodeAccountIds = signedTx.nodeAccountIds || []
          const nodeId = nodeAccountIds.length > 0 ? nodeAccountIds[0].toString() : 'Unknown'
          const signatures = signedTx._signedTransactions.list.map((protoTx: any) => {
            const sigPairs = protoTx.sigMap?.sigPair || []
            return sigPairs.map((sigPair: any) => ({
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

        // PHASE 2: EXECUTION WITH AUTOMATIC FAILOVER
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
            console.log(`[HIP-1190] Attempting node ${i + 1}/${signedTransactions.length} (${nodeId})...`)
            
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
              sendTxId(transactionId)
            }

            // If strategy is 'firstSuccess', return immediately
            if (executionStrategy === 'firstSuccess') {
              const totalDuration = performance.now() - signStart

              return {
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
            }
            
            // If strategy is 'allNodes', continue to next node
            
          } catch (error: any) {
            const execDuration = performance.now() - execStart
            
            console.error(`❌ Node ${i + 1} (${nodeId}) failed in ${execDuration.toFixed(2)}ms:`, error.message)
            
            attempts.push({
              nodeIndex: i,
              nodeId,
              status: 'failed',
              duration: execDuration,
              error: {
                errorType: error.constructor?.name || 'Error',
                errorMessage: error.message || 'Unknown error'
              }
            })

            onProgress?.({
              phase: 'executing',
              nodeIndex: i,
              totalNodes: signedTransactions.length,
              status: 'failed',
              duration: execDuration,
              error: {
                nodeIndex: i,
                errorType: error.constructor?.name || 'Error',
                errorMessage: error.message
              }
            })

            // For 'firstSuccess' strategy: if this was the last node, throw error
            if (executionStrategy === 'firstSuccess' && i === signedTransactions.length - 1) {
              const totalDuration = performance.now() - signStart
              
              // Include signatures even in error case
              const errorResult = {
                success: false,
                allSignatures,
                totalDuration,
                attempts,
                error: `Transaction failed on all ${signedTransactions.length} nodes. Last error: ${error.message}`
              }
              
              throw new Error(JSON.stringify(errorResult))
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
            // Include signatures even in error case
            const errorResult = {
              success: false,
              allSignatures,
              totalDuration,
              attempts,
              executionStrategy: 'allNodes',
              error: `All ${signedTransactions.length} nodes failed.`
            }
            
            throw new Error(JSON.stringify(errorResult))
          }

          return {
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
        }

        // This should never be reached, but TypeScript needs a return
        throw new Error('Unexpected: loop completed without returning')
      }
      default:
        throw new Error(`Unsupported Hedera method: ${methodName}`)
    }
  }

  return { executeHederaMethod: execute }
}
