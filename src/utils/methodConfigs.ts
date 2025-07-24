export interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'number' | 'address' | 'bigint'
  placeholder?: string
  defaultValue?: string
  required?: boolean
}

export interface MethodConfig {
  name: string
  fields: FieldConfig[]
  description?: string
}

// Configurations for Ethereum methods that require parameters
export const ethMethodConfigs: Record<string, MethodConfig> = {
  eth_sendTransaction: {
    name: 'Send Transaction',
    fields: [
      {
        name: 'to',
        label: 'Recipient Address',
        type: 'address',
        placeholder: 'e.g. 0xE53F9824319B891CD4D6050dBF2b242Be7e13344',
        required: true,
      },
      {
        name: 'value',
        label: 'Amount (in Hbar)',
        type: 'number',
        placeholder: 'e.g. 1',
        defaultValue: '1',
        required: true,
      },
      {
        name: 'gasLimit',
        label: 'Gas Limit',
        type: 'number',
        placeholder: 'e.g. 1000000',
        defaultValue: '1000000',
        required: true,
      },
    ],
  },
  eth_signTransaction: {
    name: 'Sign Transaction',
    fields: [
      {
        name: 'to',
        label: 'Recipient Address',
        type: 'address',
        placeholder: 'e.g. 0xE53F9824319B891CD4D6050dBF2b242Be7e13344',
        required: true,
      },
      {
        name: 'value',
        label: 'Amount (in Hbar)',
        type: 'number',
        placeholder: 'e.g. 1',
        defaultValue: '1',
        required: true,
      },
      {
        name: 'gasLimit',
        label: 'Gas Limit',
        type: 'number',
        placeholder: 'e.g. 1000000',
        defaultValue: '1000000',
        required: true,
      },
    ],
  },
  eth_signMessage: {
    name: 'Sign Message',
    fields: [
      {
        name: 'message',
        label: 'Message',
        type: 'text',
        placeholder: 'Enter message to sign',
        defaultValue: 'Hello Reown AppKit!',
        required: true,
      },
    ],
  },
  eth_call: {
    name: 'Call Contract',
    fields: [
      {
        name: 'to',
        label: 'Contract Address',
        type: 'address',
        placeholder: 'e.g. 0x0000000000000000000000000000000000000168',
        defaultValue: '0x0000000000000000000000000000000000000168',
        required: true,
      },
      {
        name: 'data',
        label: 'Data',
        type: 'text',
        placeholder: 'e.g. 0x1234',
        defaultValue: '0x1234',
        required: true,
      },
    ],
  },
  eth_getBalance: {
    name: 'Get Balance',
    fields: [
      {
        name: 'address',
        label: 'Address',
        type: 'address',
        placeholder: 'e.g. 0xE53F9824319B891CD4D6050dBF2b242Be7e13344',
        required: true,
      },
    ],
  },
  eth_feeHistory: {
    name: 'Get Fee History',
    fields: [
      {
        name: 'newestBlock',
        label: 'Newest Block',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
      {
        name: 'blockCount',
        label: 'Block Count',
        type: 'text',
        placeholder: 'e.g. 1',
        defaultValue: '1',
        required: true,
      },
    ],
  },
  eth_getCode: {
    name: 'Get Contract Code',
    fields: [
      {
        name: 'address',
        label: 'Contract Address',
        type: 'address',
        placeholder: 'e.g. 0x000000000000000000000000000000000058b83f',
        required: true,
      },
      {
        name: 'blockTag',
        label: 'Block Tag',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
    ],
  },
  eth_getStorageAt: {
    name: 'Get Storage At',
    fields: [
      {
        name: 'address',
        label: 'Address',
        type: 'address',
        placeholder: 'Address to query storage for',
        required: true,
      },
      {
        name: 'position',
        label: 'Storage Position',
        type: 'text',
        placeholder: 'e.g. 0x0',
        defaultValue: '0x0',
        required: true,
      },
      {
        name: 'blockTag',
        label: 'Block Tag',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
    ],
  },
  eth_getTransactionCount: {
    name: 'Get Transaction Count',
    fields: [
      {
        name: 'address',
        label: 'Address',
        type: 'address',
        placeholder: 'Address to query tx count',
        required: true,
      },
      {
        name: 'blockTag',
        label: 'Block Tag',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
    ],
  },
  eth_getTransactionByHash: {
    name: 'Get Transaction By Hash',
    fields: [
      {
        name: 'hash',
        label: 'Transaction Hash',
        type: 'text',
        placeholder: 'e.g. 0x...',
        required: true,
      },
    ],
  },
  eth_getTransactionReceipt: {
    name: 'Get Transaction Receipt',
    fields: [
      {
        name: 'hash',
        label: 'Transaction Hash',
        type: 'text',
        placeholder: 'e.g. 0x...',
        required: true,
      },
    ],
  },
  eth_getBlockByHash: {
    name: 'Get Block By Hash',
    fields: [
      {
        name: 'blockHash',
        label: 'Block Hash',
        type: 'text',
        placeholder: 'e.g. 0x...',
        required: true,
      },
      {
        name: 'includeTransactions',
        label: 'Include Transactions (true/false)',
        type: 'text',
        placeholder: 'e.g. false',
        defaultValue: 'false',
        required: true,
      },
    ],
  },
  eth_getBlockByNumber: {
    name: 'Get Block By Number',
    fields: [
      {
        name: 'blockTag',
        label: 'Block Tag',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
    ],
  },
  eth_getBlockTransactionCountByHash: {
    name: 'Get Block Transaction Count By Hash',
    fields: [
      {
        name: 'blockHash',
        label: 'Block Hash',
        type: 'text',
        placeholder: 'e.g. 0x...',
        defaultValue: "0xf5fa3dae6aaf31c0ec0eaf6cfb153c3916b32f0610b10c061dd70105df0f3b6e",
        required: true,
      },
    ],
  },
  eth_getBlockTransactionCountByNumber: {
    name: 'Get Block Transaction Count By Number',
    fields: [
      {
        name: 'blockTag',
        label: 'Block Tag',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
    ],
  },
  eth_getTransactionByBlockHashAndIndex: {
    name: 'Get Transaction By Block Hash And Index',
    fields: [
      {
        name: 'blockHash',
        label: 'Block Hash',
        type: 'text',
        placeholder: 'e.g. 0x...',
        required: true,
      },
      {
        name: 'index',
        label: 'Index',
        type: 'text',
        placeholder: 'e.g. 0x0',
        defaultValue: '0x0',
        required: true,
      },
    ],
  },
  eth_getTransactionByBlockNumberAndIndex: {
    name: 'Get Transaction By Block Number And Index',
    fields: [
      {
        name: 'blockNumber',
        label: 'Block Number',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
      {
        name: 'index',
        label: 'Index',
        type: 'text',
        placeholder: 'e.g. 0x0',
        defaultValue: '0x0',
        required: true,
      },
    ],
  },
  eth_getFilterLogs: {
    name: 'Get Filter Logs',
    fields: [
      {
        name: 'filterId',
        label: 'Filter ID',
        type: 'text',
        placeholder: 'e.g. 0x...',
        required: true,
      },
    ],
  },
  eth_getFilterChanges: {
    name: 'Get Filter Changes',
    fields: [
      {
        name: 'filterId',
        label: 'Filter ID',
        type: 'text',
        placeholder: 'e.g. 0x...',
        required: true,
      },
    ],
  },
  eth_newFilter: {
    name: 'New Filter',
    fields: [
      {
        name: 'address',
        label: 'Address',
        type: 'address',
        placeholder: 'e.g. 0xE53F9824319B891CD4D6050dBF2b242Be7e13344',
        required: true,
      },
      {
        name: 'fromBlock',
        label: 'From Block',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
      {
        name: 'toBlock',
        label: 'To Block',
        type: 'text',
        placeholder: 'e.g. latest',
        defaultValue: 'latest',
        required: true,
      },
    ],
  },
  eth_uninstallFilter: {
    name: 'Uninstall Filter',
    fields: [
      {
        name: 'filterId',
        label: 'Filter ID',
        type: 'text',
        placeholder: 'e.g. 0x...',
        required: true,
      },
    ],
  },
  eth_signTypedData: {
    name: 'Sign Typed Data',
    fields: [
      {
        name: 'domain',
        label: 'Domain Name',
        type: 'text',
        placeholder: 'e.g. Reown AppKit',
        defaultValue: 'Reown AppKit',
        required: true,
      },
      {
        name: 'version',
        label: 'Domain Version',
        type: 'text',
        placeholder: 'e.g. 1',
        defaultValue: '1',
        required: true,
      },
      {
        name: 'verifyingContract',
        label: 'Verifying Contract',
        type: 'address',
        placeholder: 'e.g. 0xE53F9824319B891CD4D6050dBF2b242Be7e13344',
        required: true,
      },
      {
        name: 'from_name',
        label: 'From Name',
        type: 'text',
        placeholder: 'e.g. Alice',
        defaultValue: 'Alice',
        required: true,
      },
      {
        name: 'from_wallet',
        label: 'From Wallet Address',
        type: 'address',
        placeholder: 'e.g. 0xE53F9824319B891CD4D6050dBF2b242Be7e13344',
        required: true,
      },
      {
        name: 'to_name',
        label: 'To Name',
        type: 'text',
        placeholder: 'e.g. Bob',
        defaultValue: 'Bob',
        required: true,
      },
      {
        name: 'to_wallet',
        label: 'To Wallet Address',
        type: 'address',
        placeholder: 'e.g. 0xE53F9824319B891CD4D6050dBF2b242Be7e13344',
        required: true,
      },
      {
        name: 'contents',
        label: 'Contents',
        type: 'text',
        placeholder: 'Hello, Bob!',
        required: true,
      },
    ],
  },
  eth_getLogs: {
    name: 'Get Logs',
    fields: [
      {
        name: 'address',
        label: 'Address',
        type: 'address',
        placeholder: 'e.g. 0xc6816097fb8c95266a8ac11e52826f7495523a39',
        defaultValue: '0xc6816097fb8c95266a8ac11e52826f7495523a39',
        required: true,
      },
      {
        name: 'fromBlock',
        label: 'From Block',
        type: 'text',
        placeholder: 'e.g. 0x1597a02',
        defaultValue: '0x1597a02',
        required: true,
      },
      {
        name: 'toBlock',
        label: 'To Block',
        type: 'text',
        placeholder: 'e.g. 0x1597a02',
        defaultValue: '0x1597a02',
        required: true,
      },
    ],
  },
}

// Configurations for Hedera methods that require parameters
export const hederaMethodConfigs: Record<string, MethodConfig> = {
  hedera_signAndExecuteTransaction: {
    name: 'Sign And Execute Transaction',
    fields: [
      {
        name: 'recipientId',
        label: 'Recipient ID',
        type: 'text',
        placeholder: 'e.g. 0.0.4848542',
        defaultValue: '0.0.4848542',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount (in Hbar)',
        type: 'number',
        placeholder: 'e.g. 1',
        defaultValue: '1',
        required: true,
      },
    ],
  },
  hedera_signTransaction: {
    name: 'Sign Transaction',
    fields: [
      {
        name: 'recipientId',
        label: 'Recipient ID',
        type: 'text',
        placeholder: 'e.g. 0.0.4848542',
        defaultValue: '0.0.4848542',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount (in Hbar)',
        type: 'number',
        placeholder: 'e.g. 1',
        defaultValue: '1',
        required: true,
      },
      {
        name: 'maxFee',
        label: 'Max Fee (in Hbar)',
        type: 'number',
        placeholder: 'e.g. 1',
        defaultValue: '1',
        required: true,
      },
    ],
  },
  hedera_signMessage: {
    name: 'Sign Message',
    fields: [
      {
        name: 'message',
        label: 'Message',
        type: 'text',
        placeholder: 'Enter message to sign',
        defaultValue: 'Test Message for AppKit Example',
        required: true,
      },
    ],
  },
}

// Get method config based on name
export const getMethodConfig = (methodName: string): MethodConfig | undefined => {
  return ethMethodConfigs[methodName] || hederaMethodConfigs[methodName]
}
