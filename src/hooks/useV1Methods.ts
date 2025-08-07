import { useCallback } from 'react'
import { 
  TransferTransaction,
  TopicCreateTransaction,
  AccountBalanceQuery,
  AccountId,
  Hbar,
  HbarUnit,
  Client,
} from '@hashgraph/sdk'
import { DAppSigner, DAppConnector } from '@hashgraph/hedera-wallet-connect'

interface UseV1MethodsProps {
  signers: DAppSigner[]
  accountId: string | null
  connector: DAppConnector | null
}

export function useV1Methods({ signers, accountId, connector }: UseV1MethodsProps) {
  const getSigner = useCallback(() => {
    // First try to use the passed signers
    if (signers && signers.length > 0) {
      return signers[0]
    }
    
    // If no signers but we have a connector and accountId, try to get it
    if (connector && accountId) {
      try {
        const accountIdObj = AccountId.fromString(accountId)
        const signer = connector.getSigner(accountIdObj)
        if (signer) {
          return signer
        }
      } catch (e) {
        console.warn('Could not get signer from connector:', e)
      }
    }
    
    throw new Error('No signer available. Please reconnect your wallet.')
  }, [signers, connector, accountId])

  const transferHBAR = useCallback(async () => {
    if (!accountId) throw new Error('No account connected')
    
    const signer = getSigner()
    const fromAccountId = AccountId.fromString(accountId)
    const toAccountId = AccountId.fromString('0.0.48997416') // Example recipient
    
    const transaction = new TransferTransaction()
      .addHbarTransfer(fromAccountId, new Hbar(-10, HbarUnit.Hbar))
      .addHbarTransfer(toAccountId, new Hbar(10, HbarUnit.Hbar))
      .setTransactionMemo('V1 Transfer - ' + new Date().toISOString())

    try {
      const signedTransaction = await signer.signTransaction(transaction)
      const response = await signer.call(signedTransaction)
      
      // Try to get transaction ID from response
      let transactionId = ''
      if (response && typeof response === 'object') {
        transactionId = (response as any).transactionId?.toString() || 
                       (response as any).txId?.toString() || 
                       'Transaction submitted'
      }
      
      return {
        transactionId,
        status: 'SUCCESS',
      }
    } catch (error) {
      console.error('Transfer failed:', error)
      throw error
    }
  }, [accountId, getSigner])

  const createTopic = useCallback(async () => {
    if (!accountId) throw new Error('No account connected')
    
    const signer = getSigner()
    
    const transaction = new TopicCreateTransaction()
      .setTopicMemo('V1 Topic - ' + new Date().toISOString())
      .setSubmitKey(signer.getAccountKey())

    try {
      const signedTransaction = await signer.signTransaction(transaction)
      const response = await signer.call(signedTransaction)
      
      // Try to get transaction ID from response
      let transactionId = ''
      if (response && typeof response === 'object') {
        transactionId = (response as any).transactionId?.toString() || 
                       (response as any).txId?.toString() || 
                       'Transaction submitted'
      }
      
      return {
        transactionId,
        topicId: 'Topic creation submitted',
        status: 'SUCCESS',
      }
    } catch (error) {
      console.error('Topic creation failed:', error)
      throw error
    }
  }, [accountId, getSigner])

  const getAccountBalance = useCallback(async () => {
    if (!accountId) throw new Error('No account connected')
    
    const signer = getSigner()
    const query = new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(accountId))

    try {
      const balance = await signer.call(query)
      
      return {
        hbars: balance.hbars.toString(),
        tokens: [],
      }
    } catch (error) {
      console.error('Balance query failed:', error)
      throw error
    }
  }, [accountId, getSigner])

  const signMessage = useCallback(async (message: string) => {
    if (!accountId) throw new Error('No account connected')
    
    const signer = getSigner()
    
    try {
      // Try multiple approaches for signing
      let result: any
      
      // Method 1: Direct sign with message bytes
      try {
        const messageBytes = new TextEncoder().encode(message)
        result = await signer.sign([messageBytes])
        if (result && result[0]) {
          return result[0]
        }
      } catch (e) {
        console.log('Sign method 1 failed:', e)
      }
      
      // Method 2: Sign with params object
      try {
        const params = {
          message,
          signerAccountId: accountId
        }
        result = await (signer as any).sign([params])
        if (result && result[0]) {
          return result[0]
        }
      } catch (e) {
        console.log('Sign method 2 failed:', e)
      }
      
      // Method 3: Direct signMessage if available
      if ((signer as any).signMessage) {
        result = await (signer as any).signMessage(message)
        if (result) {
          return result
        }
      }
      
      throw new Error('Unable to sign message with any available method')
    } catch (error) {
      console.error('Message signing failed:', error)
      throw error
    }
  }, [accountId, getSigner])

  const executeTransaction = useCallback(async (transaction: any) => {
    if (!accountId) throw new Error('No account connected')
    
    const signer = getSigner()
    
    try {
      const signedTransaction = await signer.signTransaction(transaction)
      const response = await signer.call(signedTransaction)
      
      // Try to get transaction ID from response
      let transactionId = ''
      if (response && typeof response === 'object') {
        transactionId = (response as any).transactionId?.toString() || 
                       (response as any).txId?.toString() || 
                       'Transaction submitted'
      }
      
      return {
        transactionId,
        status: 'SUCCESS',
        receipt: { status: { toString: () => 'SUCCESS' } },
      }
    } catch (error) {
      console.error('Transaction execution failed:', error)
      throw error
    }
  }, [accountId, getSigner])

  const getNetworkInfo = useCallback(async () => {
    try {
      const signer = getSigner()
      
      // Try to get network info from signer
      let ledgerId = 'testnet' // default
      
      if (signer.getLedgerId) {
        ledgerId = signer.getLedgerId()?.toString() || 'testnet'
      }
      
      // Try to get client for node info
      let nodes: any[] = []
      try {
        if ((signer as any).getClient) {
          const client = (signer as any).getClient() as Client
          if (client && client.network) {
            nodes = Object.entries(client.network).map(([nodeId, endpoint]) => ({
              nodeId,
              endpoint: endpoint.toString(),
            }))
          }
        }
      } catch (e) {
        console.log('Could not get network nodes:', e)
      }
      
      return {
        ledgerId,
        nodes,
      }
    } catch (error) {
      console.error('Network info query failed:', error)
      throw error
    }
  }, [getSigner])

  return {
    transferHBAR,
    createTopic,
    getAccountBalance,
    signMessage,
    executeTransaction,
    getNetworkInfo,
  }
}