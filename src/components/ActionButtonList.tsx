import { useState } from 'react'
import { ChainNamespace } from '@reown/appkit-common'
import {
  useDisconnect,
  useAppKitAccount,
  useAppKitNetworkCore,
  useAppKitState,
  useAppKitProvider,
} from '@reown/appkit/react'
import { HederaProvider } from '@hashgraph/hedera-wallet-connect'
import { JsonRpcProvider } from 'ethers'
import { Modal } from './Modal'
import { getMethodConfig, FieldConfig } from '../utils/methodConfigs'
import { FunctionResult } from '../App'
import { useEthereumMethods } from '../hooks/useEthereumMethods'
import { useHederaMethods } from '../hooks/useHederaMethods'

interface ActionButtonListProps {
  sendHash: (hash: string) => void
  sendTxId: (id: string) => void
  sendSignMsg: (hash: string) => void
  sendNodeAddresses: (nodes: string[]) => void
  ethTxHash: string
  setLastFunctionResult: (result: FunctionResult | null) => void
  onDisconnect?: () => void
  jsonRpcProvider?: JsonRpcProvider
}

export const ActionButtonList = ({
  sendHash,
  sendTxId,
  sendSignMsg,
  sendNodeAddresses,
  ethTxHash,
  setLastFunctionResult,
  onDisconnect,
  jsonRpcProvider,
}: ActionButtonListProps) => {
  const { disconnect } = useDisconnect()
  const { chainId } = useAppKitNetworkCore()
  const { isConnected, address } = useAppKitAccount()
  const { activeChain } = useAppKitState()
  const { walletProvider } = useAppKitProvider(activeChain ?? ('hedera' as ChainNamespace))

  const { executeHederaMethod } = useHederaMethods(
    walletProvider as HederaProvider,
    address!,
    sendTxId,
    sendSignMsg,
    sendNodeAddresses,
  )

  const { executeEthMethod } = useEthereumMethods({
    walletProvider: isConnected ? (walletProvider as HederaProvider) : undefined,
    chainId: isConnected ? Number(chainId) : undefined,
    address: isConnected ? address! : undefined,
    ethTxHash,
    sendHash,
    sendSignMsg,
    jsonRpcProvider,
  })

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentMethod, setCurrentMethod] = useState('')
  const [modalFields, setModalFields] = useState<FieldConfig[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleDisconnect = async () => {
    try {
      await disconnect()
      // Call the onDisconnect callback to clear UI state
      if (onDisconnect) {
        onDisconnect()
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const openModal = (methodName: string) => {
    const methodConfig = getMethodConfig(methodName)
    if (methodConfig) {
      setCurrentMethod(methodName)
      setModalFields(methodConfig.fields)
      setModalTitle(methodConfig.name)
      setIsModalOpen(true)
    } else {
      // Method doesn't need a modal, execute directly
      executeMethod(methodName, {})
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleModalSubmit = (params: Record<string, string>) => {
    closeModal()
    executeMethod(currentMethod, params)
  }

  const executeMethod = async (methodName: string, params: Record<string, string>) => {
    setIsLoading(true)
    try {
      let result

      // Execute the method based on name
      if (methodName.startsWith('hedera_')) {
        result = await executeHederaMethod(methodName, params)
      } else {
        result = await executeEthMethod(methodName, params)
      }
      // Update last function result
      setLastFunctionResult({
        functionName: methodName,
        result: typeof result === 'object' ? JSON.stringify(result) : String(result || ''),
      })
      // Show result in an alert for quick feedback
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(typeof result === 'object' ? JSON.stringify(result) : String(result || ''))
      }
    } catch (error) {
      console.error(`Error executing ${methodName}:`, error)
      setLastFunctionResult({
        functionName: methodName,
        result: `Error: ${(error as Error).message}`,
      })
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Error: ${(error as Error).message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Create buttons for supported methods
  const createMethodButton = (methodName: string, requiresConnection = true) => (
    <button
      key={methodName}
      onClick={() => openModal(methodName)}
      disabled={(requiresConnection && !isConnected) || isLoading}
      className="method-button"
    >
      {methodName}
    </button>
  )

  return (
    <div>
      <div className="appkit-buttons">
        <appkit-button />
        {isConnected && (
          <>
            <appkit-network-button />
            <button onClick={handleDisconnect}>Disconnect</button>
          </>
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        title={modalTitle}
        fields={modalFields}
        isLoading={isLoading}
      />
      <>
        {isConnected && (
          <>
            <div>
              <h2>EIP-155 Methods (Wallet):</h2>
              <hr />
            </div>
            <div>
              {createMethodButton('eth_signMessage')}
              {createMethodButton('personal_sign')}
              {createMethodButton('eth_sign')}
              {createMethodButton('eth_signTransaction')}
              {createMethodButton('eth_sendTransaction')}
              {createMethodButton('eth_signTypedData')}
              {createMethodButton('eth_signTypedData_v3')}
              {createMethodButton('eth_signTypedData_v4')}
              {createMethodButton('eth_sendRawTransaction')}
            </div>
          </>
        )}
        {isConnected && activeChain == ('hedera' as ChainNamespace) && (
          <>
            <div>
              <h2>HIP-820 Methods:</h2>
              <hr />
            </div>
            <div>
              {createMethodButton('hedera_getNodeAddresses')}
              {createMethodButton('hedera_signMessage')}
              {createMethodButton('hedera_signTransaction')}
              {createMethodButton('hedera_executeTransaction')}
              {createMethodButton('hedera_signAndExecuteQuery')}
              {createMethodButton('hedera_signAndExecuteTransaction')}
            </div>
          </>
        )}
        <hr />
        <div>
          <h2>EIP-155 Methods called directly by a dApp to a JSON-RPC provider</h2>
          <hr />
        </div>

        <div>
          <div>
            {createMethodButton('eth_getBalance', false)}
            {createMethodButton('eth_blockNumber', false)}
            {createMethodButton('eth_call', false)}
            {createMethodButton('eth_feeHistory', false)}
            {createMethodButton('eth_gasPrice', false)}
            {createMethodButton('eth_getCode', false)}
            {createMethodButton('eth_getBlockByHash', false)}
            {createMethodButton('eth_getBlockByNumber', false)}
            {createMethodButton('eth_getBlockTransactionCountByHash', false)}
            {createMethodButton('eth_getBlockTransactionCountByNumber', false)}
            {createMethodButton('eth_getFilterLogs', false)}
            {createMethodButton('eth_getFilterChanges', false)}
            {createMethodButton('eth_getLogs', false)}
            {createMethodButton('eth_getStorageAt', false)}
            {createMethodButton('eth_getTransactionByBlockHashAndIndex', false)}
            {createMethodButton('eth_getTransactionByBlockNumberAndIndex', false)}
            {createMethodButton('eth_getTransactionByHash', false)}
            {createMethodButton('eth_getTransactionCount', false)}
            {createMethodButton('eth_getTransactionReceipt', false)}
            {createMethodButton('eth_maxPriorityFeePerGas', false)}
            {createMethodButton('eth_mining', false)}
            {createMethodButton('eth_newBlockFilter', false)}
            {createMethodButton('eth_newFilter', false)}
            {createMethodButton('eth_syncing', false)}
            {createMethodButton('eth_uninstallFilter', false)}
            {createMethodButton('net_listening', false)}
            {createMethodButton('net_version', false)}
            {createMethodButton('web3_clientVersion', false)}
            {createMethodButton('eth_chainId', false)}
          </div>
        </div>
      </>
    </div>
  )
}
