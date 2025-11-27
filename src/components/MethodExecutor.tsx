import { useState } from 'react'
import { HederaJsonRpcMethod } from '@hashgraph/hedera-wallet-connect'
import { TransactionProgressModal } from './TransactionProgressModal'

interface MethodExecutorProps {
  namespace: 'hedera' | 'eip155'
  isConnected: boolean
  onExecute: (method: string, params: Record<string, string>) => Promise<unknown>
  address?: string
}

interface NodeAttempt {
  nodeIndex: number
  status: 'pending' | 'success' | 'failed'
  duration?: number
  error?: {
    errorType: string
    errorMessage: string
    stackTrace?: string
  }
}

interface MethodConfig {
  name: string
  displayName: string
  description: string
  requiresWallet?: boolean // true for wallet signature, false/undefined for RPC
  params: {
    name: string
    label: string
    type: 'text' | 'number' | 'textarea' | 'select'
    placeholder?: string
    required?: boolean
    defaultValue?: string
    options?: { value: string; label: string }[]
  }[]
}

const hederaMethods: MethodConfig[] = [
  {
    name: HederaJsonRpcMethod.GetNodeAddresses,
    displayName: 'Get Node Addresses (hedera_getNodeAddresses)',
    description: 'Retrieve the list of node addresses',
    params: [],
  },
  {
    name: HederaJsonRpcMethod.SignMessage,
    displayName: 'Sign Message (hedera_signMessage)',
    description: 'Sign a message with your account',
    params: [
      {
        name: 'message',
        label: 'Message to Sign',
        type: 'textarea',
        placeholder: 'Enter message to sign',
        required: true,
        defaultValue: 'Hello from Hedera!',
      },
    ],
  },
  {
    name: HederaJsonRpcMethod.SignTransaction,
    displayName: 'Sign Transaction (hedera_signTransaction)',
    description: 'Sign a transaction (requires separate execution)',
    params: [
      {
        name: 'recipientId',
        label: 'Recipient Account ID',
        type: 'text',
        placeholder: '0.0.12345',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount (HBAR)',
        type: 'number',
        placeholder: '1',
        required: true,
        defaultValue: '1',
      },
      {
        name: 'maxFee',
        label: 'Max Fee (HBAR)',
        type: 'number',
        placeholder: '1',
        required: true,
        defaultValue: '1',
      },
    ],
  },
  {
    name: HederaJsonRpcMethod.ExecuteTransaction,
    displayName: 'Execute Transaction (hedera_executeTransaction)',
    description: 'Execute a previously signed transaction',
    params: [],
  },
  {
    name: HederaJsonRpcMethod.SignAndExecuteTransaction,
    displayName: 'Sign & Execute Transaction (hedera_signAndExecuteTransaction)',
    description: 'Sign and execute a transaction in one step',
    params: [
      {
        name: 'recipientId',
        label: 'Recipient Account ID',
        type: 'text',
        placeholder: '0.0.12345',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount (HBAR)',
        type: 'number',
        placeholder: '1',
        required: true,
        defaultValue: '1',
      },
    ],
  },
  {
    name: HederaJsonRpcMethod.SignAndExecuteQuery,
    displayName: 'Sign & Execute Query (hedera_signAndExecuteQuery)',
    description: 'Execute a query (e.g., account info)',
    params: [],
  },
  {
    name: HederaJsonRpcMethod.SignTransactions,
    displayName: 'Sign Transactions Multi-Node (hedera_signTransactions - HIP-1190)',
    description: 'Sign transaction for multiple nodes with automatic failover and performance tracking',
    params: [
      {
        name: 'to',
        label: 'Recipient Account ID',
        type: 'text',
        placeholder: '0.0.12345',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount (HBAR)',
        type: 'number',
        placeholder: '1',
        required: true,
        defaultValue: '1',
      },
      {
        name: 'maxFee',
        label: 'Max Fee (HBAR)',
        type: 'number',
        placeholder: '1',
        required: true,
        defaultValue: '1',
      },
      {
        name: 'nodeCount',
        label: 'Number of Nodes',
        type: 'select',
        required: true,
        defaultValue: '5',
        options: [
          { value: '1', label: '1 node (testing)' },
          { value: '3', label: '3 nodes' },
          { value: '5', label: '5 nodes (recommended)' },
          { value: '7', label: '7 nodes' },
          { value: '10', label: '10 nodes (max reliability)' },
        ],
      },
      {
        name: 'executionStrategy',
        label: 'Execution Strategy',
        type: 'select',
        required: true,
        defaultValue: 'firstSuccess',
        options: [
          { value: 'firstSuccess', label: 'Stop at First Success (HIP-1190 Failover)' },
          { value: 'allNodes', label: 'Execute on All Nodes (Testing)' },
        ],
      },
    ],
  },
]

const eip155Methods: MethodConfig[] = [
  // === WALLET SIGNATURE METHODS === //
  // Transaction Methods
  {
    name: 'eth_sendTransaction',
    displayName: 'Send Transaction (eth_sendTransaction)',
    description: 'Send ETH to another address',
    requiresWallet: true,
    params: [
      {
        name: 'to',
        label: 'To Address',
        type: 'text',
        placeholder: '0x... or 0.0.12345',
        required: true,
      },
      {
        name: 'value',
        label: 'Amount (ETH)',
        type: 'number',
        placeholder: '0.001',
        required: true,
        defaultValue: '0.001',
      },
      {
        name: 'gasLimit',
        label: 'Gas Limit',
        type: 'number',
        placeholder: '21000',
        required: true,
        defaultValue: '21000',
      },
    ],
  },
  {
    name: 'eth_signTransaction',
    displayName: 'Sign Transaction (eth_signTransaction)',
    description: 'Sign a transaction without sending',
    requiresWallet: true,
    params: [
      {
        name: 'to',
        label: 'To Address',
        type: 'text',
        placeholder: '0x... or 0.0.12345',
        required: true,
      },
      {
        name: 'value',
        label: 'Amount (ETH)',
        type: 'number',
        placeholder: '0.001',
        required: true,
        defaultValue: '0.001',
      },
      {
        name: 'gasLimit',
        label: 'Gas Limit',
        type: 'number',
        placeholder: '21000',
        required: true,
        defaultValue: '21000',
      },
    ],
  },
  // Signing Methods
  {
    name: 'personal_sign',
    displayName: 'Personal Sign (personal_sign)',
    description: 'Sign a message using personal_sign',
    requiresWallet: true,
    params: [
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Enter message to sign',
        required: true,
        defaultValue: 'Hello from Ethereum!',
      },
    ],
  },
  {
    name: 'eth_sign',
    displayName: 'ETH Sign Legacy (eth_sign)',
    description: 'Legacy signing method (less secure)',
    requiresWallet: true,
    params: [
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Enter message to sign',
        required: true,
        defaultValue: 'Hello from Ethereum!',
      },
    ],
  },
  {
    name: 'eth_signTypedData',
    displayName: 'Sign Typed Data (eth_signTypedData)',
    description: 'Sign structured data (EIP-712)',
    requiresWallet: true,
    params: [
      {
        name: 'domain',
        label: 'Domain Name',
        type: 'text',
        placeholder: 'Example App',
        required: true,
        defaultValue: 'Example App',
      },
      {
        name: 'version',
        label: 'Version',
        type: 'text',
        placeholder: '1',
        required: true,
        defaultValue: '1',
      },
      {
        name: 'verifyingContract',
        label: 'Verifying Contract',
        type: 'text',
        placeholder: '0x...',
        required: true,
        defaultValue: '0x0000000000000000000000000000000000000000',
      },
      {
        name: 'from_name',
        label: 'From Name',
        type: 'text',
        placeholder: 'Alice',
        required: true,
        defaultValue: 'Alice',
      },
      {
        name: 'from_wallet',
        label: 'From Wallet',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'to_name',
        label: 'To Name',
        type: 'text',
        placeholder: 'Bob',
        required: true,
        defaultValue: 'Bob',
      },
      {
        name: 'to_wallet',
        label: 'To Wallet',
        type: 'text',
        placeholder: '0x...',
        required: true,
        defaultValue: '0x0000000000000000000000000000000000000000',
      },
      {
        name: 'contents',
        label: 'Message Contents',
        type: 'textarea',
        placeholder: 'Message content',
        required: true,
        defaultValue: 'Hello, this is a typed message!',
      },
    ],
  },
  {
    name: 'eth_signTypedData_v4',
    displayName: 'Sign Typed Data V4 (eth_signTypedData_v4)',
    description: 'Sign structured data using EIP-712 v4',
    requiresWallet: true,
    params: [
      {
        name: 'domain',
        label: 'Domain Name',
        type: 'text',
        placeholder: 'Example App',
        required: true,
        defaultValue: 'Example App',
      },
      {
        name: 'version',
        label: 'Version',
        type: 'text',
        placeholder: '1',
        required: true,
        defaultValue: '1',
      },
      {
        name: 'verifyingContract',
        label: 'Verifying Contract',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'from_name',
        label: 'From Name',
        type: 'text',
        placeholder: 'Alice',
        required: true,
        defaultValue: 'Alice',
      },
      {
        name: 'from_wallet',
        label: 'From Wallet',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'to_name',
        label: 'To Name',
        type: 'text',
        placeholder: 'Bob',
        required: true,
        defaultValue: 'Bob',
      },
      {
        name: 'to_wallet',
        label: 'To Wallet',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'contents',
        label: 'Message',
        type: 'textarea',
        placeholder: 'Message content',
        required: true,
        defaultValue: 'Hello, this is a typed message!',
      },
    ],
  },
  {
    name: 'eth_accounts',
    displayName: 'Get Accounts (eth_accounts)',
    description: 'Get list of accounts controlled by the wallet',
    requiresWallet: true,
    params: [],
  },

  // === RPC PROVIDER METHODS (No Wallet Required) === //
  // Transaction Methods
  {
    name: 'eth_sendRawTransaction',
    displayName: 'Send Raw Transaction (eth_sendRawTransaction)',
    description: 'Send a previously signed transaction',
    requiresWallet: false,
    params: [],
  },
  // Query Methods
  {
    name: 'eth_getBalance',
    displayName: 'Get Balance (eth_getBalance)',
    description: 'Get ETH balance of an address',
    requiresWallet: false,
    params: [
      {
        name: 'address',
        label: 'Address',
        type: 'text',
        placeholder: '0x... or use connected address',
        required: false,
      },
    ],
  },
  {
    name: 'eth_chainId',
    displayName: 'Get Chain ID (eth_chainId)',
    description: 'Get the current chain ID',
    requiresWallet: false,
    params: [],
  },
  {
    name: 'eth_blockNumber',
    displayName: 'Get Block Number (eth_blockNumber)',
    description: 'Get the latest block number',
    requiresWallet: false,
    params: [],
  },
  {
    name: 'eth_gasPrice',
    displayName: 'Get Gas Price (eth_gasPrice)',
    description: 'Get current gas price',
    requiresWallet: false,
    params: [],
  },
  {
    name: 'eth_getTransactionCount',
    displayName: 'Get Transaction Count (eth_getTransactionCount)',
    description: 'Get nonce for an address',
    requiresWallet: false,
    params: [],
  },
  {
    name: 'eth_getTransactionByHash',
    displayName: 'Get Transaction by Hash (eth_getTransactionByHash)',
    description: 'Get transaction details by hash',
    requiresWallet: false,
    params: [
      {
        name: 'hash',
        label: 'Transaction Hash',
        type: 'text',
        placeholder: '0x...',
        required: false,
      },
    ],
  },
  {
    name: 'eth_getTransactionReceipt',
    displayName: 'Get Transaction Receipt (eth_getTransactionReceipt)',
    description: 'Get transaction receipt by hash',
    requiresWallet: false,
    params: [
      {
        name: 'hash',
        label: 'Transaction Hash',
        type: 'text',
        placeholder: '0x...',
        required: false,
      },
    ],
  },
  // Block Methods
  {
    name: 'eth_getBlockByNumber',
    displayName: 'Get Block by Number (eth_getBlockByNumber)',
    description: 'Get block information by number',
    requiresWallet: false,
    params: [
      {
        name: 'blockTag',
        label: 'Block Number/Tag',
        type: 'text',
        placeholder: 'latest, earliest, or block number',
        required: true,
        defaultValue: 'latest',
      },
      {
        name: 'includeTransactions',
        label: 'Include Transactions',
        type: 'select',
        options: [
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Yes' },
        ],
        defaultValue: 'false',
      },
    ],
  },
  // Contract Methods
  {
    name: 'eth_call',
    displayName: 'Call Contract (eth_call)',
    description: 'Call a contract method',
    requiresWallet: false,
    params: [
      {
        name: 'to',
        label: 'Contract Address',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'data',
        label: 'Call Data',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
    ],
  },
  {
    name: 'eth_getCode',
    displayName: 'Get Contract Code (eth_getCode)',
    description: 'Get bytecode at address',
    requiresWallet: false,
    params: [
      {
        name: 'address',
        label: 'Contract Address',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'blockTag',
        label: 'Block Tag',
        type: 'text',
        placeholder: 'latest',
        defaultValue: 'latest',
      },
    ],
  },
  // Storage Methods
  {
    name: 'eth_getStorageAt',
    displayName: 'Get Storage At (eth_getStorageAt)',
    description: 'Get storage value at position',
    requiresWallet: false,
    params: [
      {
        name: 'address',
        label: 'Contract Address',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'position',
        label: 'Storage Position',
        type: 'text',
        placeholder: '0x0',
        required: true,
        defaultValue: '0x0',
      },
      {
        name: 'blockTag',
        label: 'Block Tag',
        type: 'text',
        placeholder: 'latest',
        defaultValue: 'latest',
      },
    ],
  },
  // Logs and Events
  {
    name: 'eth_getLogs',
    displayName: 'Get Logs (eth_getLogs)',
    description: 'Get event logs',
    requiresWallet: false,
    params: [
      {
        name: 'address',
        label: 'Contract Address',
        type: 'text',
        placeholder: '0x...',
        required: true,
      },
      {
        name: 'fromBlock',
        label: 'From Block',
        type: 'text',
        placeholder: 'earliest or block number',
        defaultValue: 'earliest',
      },
      {
        name: 'toBlock',
        label: 'To Block',
        type: 'text',
        placeholder: 'latest or block number',
        defaultValue: 'latest',
      },
    ],
  },
  // Network Methods
  {
    name: 'net_version',
    displayName: 'Network Version (net_version)',
    description: 'Get network version',
    requiresWallet: false,
    params: [],
  },
  {
    name: 'web3_clientVersion',
    displayName: 'Client Version (web3_clientVersion)',
    description: 'Get client version string',
    requiresWallet: false,
    params: [],
  },
]

export function MethodExecutor({
  namespace,
  isConnected,
  onExecute,
  address,
}: MethodExecutorProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data: unknown } | null>(null)
  
  // Progress modal state
  const [progressState, setProgressState] = useState<{
    isOpen: boolean
    phase: 'signing' | 'executing' | 'complete' | 'failed'
    nodeIndex?: number
    totalNodes: number
    signingDuration?: number
    attempts: NodeAttempt[]
    transactionId?: string
  }>({
    isOpen: false,
    phase: 'signing',
    totalNodes: 0,
    attempts: [],
  })
  
  // Store last params for retry
  const [lastTransactionParams, setLastTransactionParams] = useState<Record<string, string> | null>(null)

  // Filter out hidden methods for hedera namespace
  const hiddenHederaMethods = [
    HederaJsonRpcMethod.GetNodeAddresses,
    HederaJsonRpcMethod.ExecuteTransaction,
    HederaJsonRpcMethod.SignAndExecuteQuery,
  ]

  const methods =
    namespace === 'hedera'
      ? hederaMethods.filter(
          (m) => !hiddenHederaMethods.includes(m.name as HederaJsonRpcMethod),
        )
      : eip155Methods
  const currentMethod = methods.find((m) => m.name === selectedMethod)

  const handleMethodChange = (methodName: string) => {
    setSelectedMethod(methodName)
    setFormValues({})
    setResult(null)

    // Set default values for the selected method
    const method = methods.find((m) => m.name === methodName)
    if (method) {
      const defaults: Record<string, string> = {}
      method.params.forEach((param) => {
        if (param.defaultValue) {
          defaults[param.name] = param.defaultValue
        }
        // Auto-fill address fields
        if (param.name === 'address' && !param.required && address) {
          defaults[param.name] = address
        }
        if (param.name === 'from_wallet' && address) {
          defaults[param.name] = address
        }
      })
      setFormValues(defaults)
    }
  }

  const handleInputChange = (name: string, value: string) => {
    console.log('[MethodExecutor.handleInputChange] Field:', name, 'Value:', value)
    setFormValues((prev) => {
      const updated = { ...prev, [name]: value }
      console.log('[MethodExecutor.handleInputChange] Updated formValues:', updated)
      return updated
    })
  }

  // TODO: Wire up progress updates from hooks to modal
  // Currently progress callbacks in hooks are not connected to MethodExecutor's modal state
  // This requires passing a callback from MethodExecutor -> App -> Hooks which needs refactoring

  // Retry function for HIP-1190
  const handleRetry = async () => {
    if (!lastTransactionParams) return
    
    // Reset progress state
    setProgressState({
      isOpen: true,
      phase: 'signing',
      totalNodes: Number(lastTransactionParams.nodeCount) || 5,
      attempts: [],
    })
    
    // Re-execute with same params
    await executeWithProgress(HederaJsonRpcMethod.SignTransactions, lastTransactionParams)
  }

  // Execute with progress tracking
  const executeWithProgress = async (method: string, params: Record<string, string>) => {
    console.log('[MethodExecutor.executeWithProgress] Method:', method, 'Params:', params)
    setIsExecuting(true)
    setResult(null)

    try {
      console.log('[MethodExecutor.executeWithProgress] Calling onExecute...')
      const data = await onExecute(method, params)
      console.log('[MethodExecutor.executeWithProgress] Success, data:', data)
      
      // Update progress state to complete
      setProgressState(prev => ({
        ...prev,
        phase: 'complete',
        transactionId: typeof data === 'object' && data !== null && 'transactionId' in data 
          ? String(data.transactionId) 
          : undefined,
      }))
      
      setResult({ success: true, data })
    } catch (error) {
      console.error('[MethodExecutor.executeWithProgress] Error caught:', error)
      // Update progress state to failed
      setProgressState(prev => ({
        ...prev,
        phase: 'failed',
      }))
      
      setResult({
        success: false,
        data: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      console.log('[MethodExecutor.executeWithProgress] Finally block')
      setIsExecuting(false)
    }
  }

  const handleExecute = async () => {
    if (!currentMethod) return

    const params = { ...formValues }
    
    console.log('[MethodExecutor.handleExecute] Method:', currentMethod.name, 'Params:', params)

    // Auto-fill address if not provided for certain methods
    if (currentMethod.name === 'eth_getBalance' && !params.address && address) {
      params.address = address
    }

    // Handle HIP-1190 with progress modal
    if (currentMethod.name === HederaJsonRpcMethod.SignTransactions) {
      console.log('[MethodExecutor.handleExecute] HIP-1190 detected')
      setLastTransactionParams(params)
      setProgressState({
        isOpen: true,
        phase: 'signing',
        totalNodes: Number(params.nodeCount) || 5,
        attempts: [],
      })
      await executeWithProgress(currentMethod.name, params)
      return
    }

    // Regular execution for other methods
    setIsExecuting(true)
    setResult(null)

    try {
      const data = await onExecute(currentMethod.name, params)
      setResult({ success: true, data })
    } catch (error) {
      setResult({
        success: false,
        data: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsExecuting(false)
    }
  }

  if (!isConnected) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p>Please connect your wallet to execute methods</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <h3>{namespace === 'hedera' ? 'Hedera' : 'EIP-155'} Methods</h3>

      {/* Legend for EIP-155 methods */}
      {namespace === 'eip155' && (
        <div
          style={{
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            gap: '20px',
          }}
        >
          <span>
            🔐 <strong>Wallet</strong> - Requires wallet signature
          </span>
          <span>
            🌐 <strong>RPC</strong> - Direct blockchain query
          </span>
        </div>
      )}

      {/* Method Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select Method:
        </label>
        <select
          value={selectedMethod}
          onChange={(e) => handleMethodChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '14px',
          }}
        >
          <option value="">-- Select a method --</option>
          {methods.map((method) => (
            <option key={method.name} value={method.name}>
              {namespace === 'eip155' && method.requiresWallet !== undefined
                ? `${method.requiresWallet ? '🔐 ' : '🌐 '}${method.displayName}`
                : method.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Method Details and Form */}
      {currentMethod && (
        <div
          style={{
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }}
        >
          <h4
            style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {currentMethod.displayName}
            {namespace === 'eip155' && currentMethod.requiresWallet !== undefined && (
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: currentMethod.requiresWallet ? '#ffeaa7' : '#74b9ff',
                  color: currentMethod.requiresWallet ? '#d63031' : '#0984e3',
                  fontWeight: 'normal',
                }}
              >
                {currentMethod.requiresWallet ? '🔐 Wallet' : '🌐 RPC'}
              </span>
            )}
          </h4>
          <p
            style={{
              margin: '0 0 15px 0',
              color: '#666',
              fontSize: '14px',
            }}
          >
            {currentMethod.description}
            {namespace === 'eip155' && currentMethod.requiresWallet !== undefined && (
              <span
                style={{
                  display: 'block',
                  marginTop: '4px',
                  fontSize: '12px',
                  fontStyle: 'italic',
                }}
              >
                {currentMethod.requiresWallet
                  ? 'This method requires wallet signature'
                  : 'This method queries data directly from the blockchain'}
              </span>
            )}
          </p>

          {/* Form Fields */}
          {currentMethod.params.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              {currentMethod.params.map((param) => (
                <div key={param.name} style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    {param.label} {param.required && <span style={{ color: 'red' }}>*</span>}
                  </label>
                  {param.type === 'textarea' ? (
                    <textarea
                      value={formValues[param.name] || ''}
                      onChange={(e) => handleInputChange(param.name, e.target.value)}
                      placeholder={param.placeholder}
                      required={param.required}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        minHeight: '80px',
                        resize: 'vertical',
                      }}
                    />
                  ) : param.type === 'select' ? (
                    <select
                      value={formValues[param.name] || ''}
                      onChange={(e) => handleInputChange(param.name, e.target.value)}
                      required={param.required}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    >
                      {param.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={param.type}
                      value={formValues[param.name] || ''}
                      onChange={(e) => handleInputChange(param.name, e.target.value)}
                      placeholder={param.placeholder}
                      required={param.required}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isExecuting ? '#ccc' : '#7B3FF2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
            }}
          >
            {isExecuting ? 'Executing...' : `Execute ${currentMethod.displayName}`}
          </button>

          {/* Result Display */}
          {result && (
            <div
              style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: result.success ? '#e8f5e9' : '#ffebee',
                borderRadius: '4px',
                border: `1px solid ${result.success ? '#4caf50' : '#f44336'}`,
              }}
            >
              <strong style={{ color: result.success ? '#2e7d32' : '#c62828' }}>
                {result.success ? 'Success:' : 'Error:'}
              </strong>
              
              {/* Special formatting for HIP-1190 results */}
              {result.success && 
               currentMethod.name === HederaJsonRpcMethod.SignTransactions && 
               typeof result.data === 'object' && 
               result.data !== null &&
               'attempts' in result.data ? (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    border: '1px solid #ddd'
                  }}>
                    <strong>📊 Multi-Node Signing Summary:</strong>
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>
                      <div>✅ <strong>Nodes Signed:</strong> {(result.data as any).attempts?.length || 0}</div>
                      <div>⏱️ <strong>Total Duration:</strong> {(result.data as any).totalDuration?.toFixed(2)}ms</div>
                      <div>🔏 <strong>Signing Time:</strong> {(result.data as any).signingDuration?.toFixed(2)}ms</div>
                      {(result.data as any).transactionId && (
                        <div>🆔 <strong>Transaction ID:</strong> {(result.data as any).transactionId}</div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    border: '1px solid #ddd'
                  }}>
                    <strong>🗂️ Node Details:</strong>
                    {(result.data as any).attempts?.map((attempt: any, idx: number) => (
                      <div key={idx} style={{ 
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: attempt.status === 'success' ? '#e8f5e9' : '#ffebee',
                        borderRadius: '4px',
                        fontSize: '13px',
                        border: `1px solid ${attempt.status === 'success' ? '#4caf50' : '#f44336'}`
                      }}>
                        <div><strong>Node {idx + 1}:</strong> {attempt.nodeId || 'N/A'}</div>
                        <div>Status: {attempt.status === 'success' ? '✅ Success' : '❌ Failed'}</div>
                        <div>Duration: {attempt.duration?.toFixed(2)}ms</div>
                        {attempt.signatureMap && (
                          <div style={{ marginTop: '4px' }}>
                            <strong>Signature Map:</strong>
                            <pre style={{ 
                              margin: '4px 0 0 0',
                              fontSize: '11px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              fontFamily: 'monospace',
                              maxHeight: '100px',
                              overflow: 'auto'
                            }}>
                              {attempt.signatureMap.substring(0, 100)}...
                            </pre>
                          </div>
                        )}
                        {attempt.error && (
                          <div style={{ marginTop: '4px', color: '#c62828' }}>
                            <strong>Error:</strong> {attempt.error.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      📄 Full JSON Response
                    </summary>
                    <pre
                      style={{
                        margin: '8px 0 0 0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderRadius: '4px',
                        maxHeight: '300px',
                        overflow: 'auto'
                      }}
                    >
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <pre
                  style={{
                    margin: '8px 0 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                >
                  {typeof result.data === 'object'
                    ? JSON.stringify(result.data, null, 2)
                    : String(result.data)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transaction Progress Modal for HIP-1190 */}
      <TransactionProgressModal
        isOpen={progressState.isOpen}
        phase={progressState.phase}
        nodeIndex={progressState.nodeIndex}
        totalNodes={progressState.totalNodes}
        signingDuration={progressState.signingDuration}
        attempts={progressState.attempts}
        transactionId={progressState.transactionId}
        onClose={() => setProgressState(prev => ({ ...prev, isOpen: false }))}
        onRetry={handleRetry}
      />
    </div>
  )
}
