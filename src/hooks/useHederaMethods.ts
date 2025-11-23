import { useState } from 'react'
import {
  AccountId,
  AccountInfo,
  AccountInfoQuery,
  Hbar,
  Transaction as HederaTransaction,
  Query,
  TransactionId,
  TransferTransaction,
  Client,
} from '@hashgraph/sdk'
import {
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
        
        const nodeCount = Number(p.nodeCount) || 5
        
        console.log('[HIP-1190] Parsed nodeCount:', nodeCount)
        console.log('[HIP-1190] Requesting signatures for', nodeCount, 'nodes')

        // Create transaction WITHOUT node IDs (required for HIP-1190)
        const transaction = new TransferTransaction()
          .setTransactionId(TransactionId.generate(accountId))
          .addHbarTransfer(accountId, new Hbar(-Number(p.amount)))
          .addHbarTransfer(AccountId.fromString(p.to), new Hbar(Number(p.amount)))
          .setMaxTransactionFee(new Hbar(Number(p.maxFee) || 2))

        // Track signing time
        const signStart = performance.now()
        
        onProgress?.({ 
          phase: 'signing', 
          totalNodes: nodeCount 
        })

        // Sign for multiple nodes (HIP-1190)
        const signedTransactions = await walletProvider.hedera_signTransactions({
          signerAccountId: 'hedera:testnet:' + accountId,
          transactionBody: transaction as HederaTransaction,
          nodeCount
        })

        const signingDuration = performance.now() - signStart
        
        console.log(`✅ Signed transaction for ${signedTransactions.length} nodes in ${signingDuration.toFixed(2)}ms`)

        // Extract node information from each signed transaction
        const attempts = signedTransactions.map((signedTx, index) => {
          const nodeAccountIds = signedTx.nodeAccountIds || []
          const nodeId = nodeAccountIds.length > 0 ? nodeAccountIds[0].toString() : 'Unknown'
          
          // Get signature map from transaction
          let signatureMap = 'N/A'
          try {
            const txBytes = signedTx.toBytes()
            signatureMap = Buffer.from(txBytes).toString('base64').substring(0, 100)
          } catch (e) {
            signatureMap = 'Unable to extract'
          }

          return {
            nodeIndex: index,
            nodeId,
            status: 'success' as const,
            duration: 0, // Signing was done in batch
            signatureMap
          }
        })

        const totalDuration = performance.now() - signStart

        return {
          success: true,
          totalNodes: signedTransactions.length,
          signingDuration,
          totalDuration,
          attempts,
          message: `Successfully signed transaction for ${signedTransactions.length} nodes`
        }
      }
      default:
        throw new Error(`Unsupported Hedera method: ${methodName}`)
    }
  }

  return { executeHederaMethod: execute }
}
