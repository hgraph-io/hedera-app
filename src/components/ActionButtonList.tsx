import { ChainNamespace } from '@reown/appkit-common'
import {
  useDisconnect,
  useAppKitAccount,
  useAppKitNetworkCore,
  useAppKitState,
  useAppKitProvider,
} from '@reown/appkit/react'
import { BrowserProvider, formatEther, JsonRpcSigner, parseEther, Wallet } from 'ethers'
import { useState } from 'react'
import {
  AccountInfo,
  AccountInfoQuery,
  Hbar,
  Transaction as HederaTransaction,
  TransactionId,
  TransferTransaction,
} from '@hashgraph/sdk'
import {
  queryToBase64String,
  SignAndExecuteQueryParams,
  SignMessageParams,
  transactionToBase64String,
  HederaProvider,
} from '@hashgraph/hedera-wallet-connect'

// Example receiver addresses
const testEthReceiver = '0xE53F9824319B891CD4D6050dBF2b242Be7e13344'
const testNativeReceiver = '0.0.4848542'

// Example types, and message (EIP-712)
const types = {
  Person: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' },
  ],
  Mail: [
    { name: 'from', type: 'Person' },
    { name: 'to', type: 'Person' },
    { name: 'contents', type: 'string' },
  ],
}

const message = {
  from: {
    name: 'Alice',
    wallet: Wallet.createRandom().address,
  },
  to: {
    name: 'Bob',
    wallet: Wallet.createRandom().address,
  },
  contents: 'Hello, Bob!',
}

interface ActionButtonListProps {
  sendHash: (hash: string) => void
  sendTxId: (id: string) => void
  sendSignMsg: (hash: string) => void
  sendBalance: (balance: string) => void
  sendNodeAddresses: (nodes: string[]) => void
}

export const ActionButtonList = ({
  sendHash,
  sendTxId,
  sendSignMsg,
  sendBalance,
  sendNodeAddresses,
}: ActionButtonListProps) => {
  const { disconnect } = useDisconnect()
  const { chainId } = useAppKitNetworkCore()
  const { isConnected, address } = useAppKitAccount()
  const { activeChain } = useAppKitState()
  const [signedHederaTx, setSignedHederaTx] = useState<HederaTransaction>()
  const [signedEthTx, setSignedEthTx] = useState<string>()

  const { walletProvider } = useAppKitProvider(activeChain ?? ('hedera' as ChainNamespace))
  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  // --- HIP-820 ---

  const getWalletProvider = () => {
    if (!walletProvider) throw Error('user is disconnected')
    return walletProvider as HederaProvider
  }

  const hedera_getNodeAddresses = async () => {
    const walletProvider = getWalletProvider()
    const result = await walletProvider.hedera_getNodeAddresses()

    window.alert('Node addresses: ' + JSON.stringify(result.nodes))
    sendNodeAddresses(result.nodes)
  }

  const hedera_executeTransaction = async () => {
    const walletProvider = getWalletProvider()
    if (!signedHederaTx) {
      throw Error('Transaction not signed, use hedera_signTransaction first')
    }

    const transactionList = transactionToBase64String(signedHederaTx)

    const result = await walletProvider.hedera_executeTransaction({
      transactionList,
    })
    setSignedHederaTx(undefined)

    window.alert('Transaction Id: ' + result.transactionId)
    sendTxId(result.transactionId)
  }

  const hedera_signMessage = async () => {
    const walletProvider = getWalletProvider()

    const params: SignMessageParams = {
      signerAccountId: 'hedera:testnet:' + address,
      message: 'Test Message for AppKit Example',
    }

    const { signatureMap } = await walletProvider.hedera_signMessage(params)

    window.alert('Signed message: ' + signatureMap)
    sendSignMsg(signatureMap)
  }

  const hedera_signTransaction = async () => {
    const walletProvider = getWalletProvider()

    const accountId = address!
    const hbarAmount = new Hbar(Number(1))
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId))
      .setMaxTransactionFee(new Hbar(Number(1)))
      .addHbarTransfer(accountId.toString()!, hbarAmount.negated())
      .addHbarTransfer(testNativeReceiver, hbarAmount)

    const transactionSigned = await walletProvider.hedera_signTransaction({
      signerAccountId: 'hedera:testnet:' + address,
      transactionBody: transaction,
    })
    window.alert(
      'Signed transaction: ' +
      JSON.stringify((transactionSigned as HederaTransaction).getSignatures()),
    )
    setSignedHederaTx(transactionSigned as HederaTransaction)
  }

  const hedera_signAndExecuteQuery = async () => {
    const walletProvider = getWalletProvider()
    const accountId = address!
    const query = new AccountInfoQuery().setAccountId(accountId)

    const params: SignAndExecuteQueryParams = {
      signerAccountId: 'hedera:testnet:' + accountId,
      query: queryToBase64String(query),
    }

    const result = await walletProvider.hedera_signAndExecuteQuery(params)
    const bytes = Buffer.from(result.response, 'base64')
    const accountInfo = AccountInfo.fromBytes(bytes)
    window.alert('hedera_signAndExecuteQuery result: ' + JSON.stringify(accountInfo))
  }
  const hedera_signAndExecuteTransaction = async () => {
    const walletProvider = getWalletProvider()

    const accountId = address!
    const hbarAmount = new Hbar(Number(1))
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId))
      .addHbarTransfer(accountId.toString()!, hbarAmount.negated())
      .addHbarTransfer(testNativeReceiver, hbarAmount)

    const result = await walletProvider.hedera_signAndExecuteTransaction({
      signerAccountId: 'hedera:testnet:' + accountId,
      transactionList: transactionToBase64String(transaction),
    })
    window.alert('Transaction Id: ' + result.transactionId)
    sendTxId(result.transactionId)
  }

  // --- EIP-155 ---

  // function to send a tx
  const eth_sendTransaction = async () => {
    const walletProvider = getWalletProvider()
    if (!address) throw Error('user is disconnected')

    const provider = new BrowserProvider(walletProvider, chainId)
    const signer = new JsonRpcSigner(provider, address)

    const tx = await signer.sendTransaction({
      to: testEthReceiver,
      value: parseEther('1'), // 1 Hbar
      gasLimit: 1_000_000,
    })
    window.alert('Transaction hash: ' + tx.hash)
    sendHash(tx.hash)
  }

  // function to sing a msg
  const eth_signMessage = async () => {
    const walletProvider = getWalletProvider()
    if (!address) throw Error('user is disconnected')

    const provider = new BrowserProvider(walletProvider, chainId)
    const signer = new JsonRpcSigner(provider, address)
    const sig = await signer?.signMessage('Hello Reown AppKit!')
    window.alert('Message signature: ' + sig)
    sendSignMsg(sig)
  }

  // function to sign a tx
  const eth_signTransaction = async () => {
    try {
      const walletProvider = getWalletProvider()
      if (!address) throw Error('user is disconnected')

      const provider = new BrowserProvider(walletProvider, chainId)
      const signer = new JsonRpcSigner(provider, address)

      const txData = {
        to: testEthReceiver,
        value: parseEther('1'),
        gasLimit: 1_000_000,
      }
      const rawSignedTx = await signer.signTransaction(txData)

      window.alert('Signed transaction: ' + rawSignedTx)

      setSignedEthTx(rawSignedTx)
    }
    catch (e) {
      console.error(e);
    }
  }

  // send raw signed transaction
  const eth_sendRawTransaction = async () => {
    try {
      if (!signedEthTx) throw Error('No raw transaction found!')

      const walletProvider = getWalletProvider()
      if (!address) throw Error('user is disconnected')

    const provider = new BrowserProvider(walletProvider, chainId)
    // Broadcast the raw signed transaction to the network
    const txHash = await provider.send('eth_sendRawTransaction', [signedEthTx])

      window.alert('Transaction hash: ' + txHash)
      setSignedEthTx(undefined)
      sendHash(txHash)
    }
    catch (e) {
      console.error(e);
    }
  }

  // function to sign typed data
  const eth_signTypedData = async () => {
    const walletProvider = getWalletProvider()
    if (!address) {
      throw Error('user is disconnected')
    }

    // Prepare Ethers signers
    const provider = new BrowserProvider(walletProvider, chainId)
    const signer = new JsonRpcSigner(provider, address)

    // Sign typed data
    try {
      const domain = {
        name: 'Reown AppKit',
        version: '1',
        chainId,
        verifyingContract: Wallet.createRandom().address,
      }
      const signature = await signer.signTypedData(domain, types, message)
      window.alert('Typed data signature: ' + signature)
      sendSignMsg(signature)
    } catch (err) {
      alert('Error signing typed data:' + err)
    }
  }

  // ------------------ Additional EIP-155 JSON-RPC Test Methods ------------------

  // Returns current account balance
  const eth_getBalance = async () => {
    const provider = getWalletProvider()
    if (!address) throw Error('User is disconnected')
    const browserProvider = new BrowserProvider(provider, chainId)
    const balance = await browserProvider.getBalance(address)
    const formatted = formatEther(balance)
    window.alert(`Balance: ${formatted}ℏ`)
    sendBalance(`${formatted}ℏ`)
  }

  // Returns the latest block number
  const eth_blockNumber = async () => {
    const provider = getWalletProvider()
    const bn = await provider.eth_blockNumber()
    window.alert('eth_blockNumber: ' + bn)
  }

  // Executes a simple call (dummy data)
  const eth_call = async () => {
    const provider = getWalletProvider()
    const result = await provider.eth_call({ to: testEthReceiver, data: '0x' })
    window.alert('eth_call result: ' + JSON.stringify(result))
  }

  // Returns fee history for last 5 blocks (empty reward percentiles)
  const eth_feeHistory = async () => {
    const provider = getWalletProvider()
    const history = await provider.eth_feeHistory(5, 'latest', [])
    window.alert('eth_feeHistory: ' + JSON.stringify(history))
  }

  // Returns current gas price
  const eth_gasPrice = async () => {
    const provider = getWalletProvider()
    const price = await provider.eth_gasPrice()
    window.alert('eth_gasPrice: ' + price)
  }

  // Returns contract code at given address (using current account address as dummy)
  const eth_getCode = async () => {
    const provider = getWalletProvider()
    if (!address) throw Error('User is disconnected')
    const code = await provider.eth_getCode(address, 'latest')
    window.alert('eth_getCode: ' + code)
  }

  // Returns block details by hash. First fetch latest block by number, then use its hash.
  const eth_getBlockByHash = async () => {
    const provider = getWalletProvider()
    const block = await provider.eth_getBlockByNumber('latest', false) as { hash: string }
    const result = await provider.eth_getBlockByHash(block.hash, false)
    window.alert('eth_getBlockByHash: ' + JSON.stringify(result))
  }

  // Returns block details by number (using "latest")
  const eth_getBlockByNumber = async () => {
    const provider = getWalletProvider()
    const result = await provider.eth_getBlockByNumber('latest', false)
    window.alert('eth_getBlockByNumber: ' + JSON.stringify(result))
  }

  // Returns transaction count in a block by hash
  const eth_getBlockTransactionCountByHash = async () => {
    const provider = getWalletProvider()
    const block = await provider.eth_getBlockByNumber('latest', false) as { hash: string }
    const count = await provider.eth_getBlockTransactionCountByHash(block.hash)
    window.alert('eth_getBlockTransactionCountByHash: ' + count)
  }

  // Returns transaction count in a block by number
  const eth_getBlockTransactionCountByNumber = async () => {
    const provider = getWalletProvider()
    const count = await provider.eth_getBlockTransactionCountByNumber('latest')
    window.alert('eth_getBlockTransactionCountByNumber: ' + count)
  }

  // Returns filter logs for a dummy filter (using current address as filter)
  const eth_getFilterLogs = async () => {
    const provider = getWalletProvider()
    const filter = { address: address, fromBlock: 'latest', toBlock: 'latest' }
    const logs = await provider.eth_getFilterLogs(filter)
    window.alert('eth_getFilterLogs: ' + JSON.stringify(logs))
  }

  // Returns filter changes for a dummy filterId ("0x1")
  const eth_getFilterChanges = async () => {
    const provider = getWalletProvider()
    const changes = await provider.eth_getFilterChanges('0x1')
    window.alert('eth_getFilterChanges: ' + JSON.stringify(changes))
  }

  // Returns logs for a dummy filter (using current address)
  const eth_getLogs = async () => {
    const provider = getWalletProvider()
    const filter = { address: address, fromBlock: 'latest', toBlock: 'latest' }
    const logs = await provider.eth_getLogs(filter)
    window.alert('eth_getLogs: ' + JSON.stringify(logs))
  }

  // Returns storage at a dummy position ("0x0") for current address
  const eth_getStorageAt = async () => {
    const provider = getWalletProvider()
    const storage = await provider.eth_getStorageAt(address!, '0x0', 'latest')
    window.alert('eth_getStorageAt: ' + storage)
  }

  // Returns a transaction from a block by hash and index (dummy index "0x0")
  const eth_getTransactionByBlockHashAndIndex = async () => {
    const provider = getWalletProvider()
    const block = await provider.eth_getBlockByNumber('latest', false) as { hash: string };
    const tx = await provider.eth_getTransactionByBlockHashAndIndex(block.hash, '0x0')
    window.alert('eth_getTransactionByBlockHashAndIndex: ' + JSON.stringify(tx))
  }

  // Returns a transaction from a block by number and index (dummy index "0x0")
  const eth_getTransactionByBlockNumberAndIndex = async () => {
    const provider = getWalletProvider()
    const tx = await provider.eth_getTransactionByBlockNumberAndIndex('latest', '0x0')
    window.alert('eth_getTransactionByBlockNumberAndIndex: ' + JSON.stringify(tx))
  }

  // Returns transaction details by hash (using hash from signed raw transaction if available)
  const eth_getTransactionByHash = async () => {
    const provider = getWalletProvider()
    if (!signedEthTx) return window.alert('No signed transaction hash available')
    const tx = await provider.eth_getTransactionByHash(signedEthTx)
    window.alert('eth_getTransactionByHash: ' + JSON.stringify(tx))
  }

  // Returns transaction count for current address
  const eth_getTransactionCount = async () => {
    const provider = getWalletProvider()
    const count = await provider.eth_getTransactionCount(address!, 'latest')
    window.alert('eth_getTransactionCount: ' + count)
  }

  // Returns transaction receipt for a given hash (using signedEthTx if available)
  const eth_getTransactionReceipt = async () => {
    const provider = getWalletProvider()
    if (!signedEthTx) return window.alert('No signed transaction hash available')
    const receipt = await provider.eth_getTransactionReceipt(signedEthTx)
    window.alert('eth_getTransactionReceipt: ' + JSON.stringify(receipt))
  }

  // Returns maxPriorityFeePerGas
  const eth_maxPriorityFeePerGas = async () => {
    const provider = getWalletProvider()
    const fee = await provider.eth_maxPriorityFeePerGas()
    window.alert('eth_maxPriorityFeePerGas: ' + fee)
  }

  // Returns mining status (should be false)
  const eth_mining = async () => {
    const provider = getWalletProvider()
    const mining = await provider.eth_mining()
    window.alert('eth_mining: ' + mining)
  }

  // Creates a new block filter and returns its id
  const eth_newBlockFilter = async () => {
    const provider = getWalletProvider()
    const filterId = await provider.eth_newBlockFilter()
    window.alert('eth_newBlockFilter: ' + filterId)
  }

  // Creates a new filter (dummy filter) and returns its id
  const eth_newFilter = async () => {
    const provider = getWalletProvider()
    const filter = { address: address, fromBlock: 'latest', toBlock: 'latest' }
    const filterId = await provider.eth_newFilter(filter)
    window.alert('eth_newFilter: ' + filterId)
  }

  // Dummy call to eth_submitWork with zeroed parameters
  const eth_submitWork = async () => {
    const provider = getWalletProvider()
    const result = await provider.eth_submitWork([
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ])
    window.alert('eth_submitWork: ' + JSON.stringify(result))
  }

  // Returns syncing status
  const eth_syncing = async () => {
    const provider = getWalletProvider()
    const syncing = await provider.eth_syncing()
    window.alert('eth_syncing: ' + JSON.stringify(syncing))
  }

  // Uninstalls a filter (dummy filter id "0x1")
  const eth_uninstallFilter = async () => {
    const provider = getWalletProvider()
    const result = await provider.eth_uninstallFilter('0x1')
    window.alert('eth_uninstallFilter: ' + result)
  }

  // Returns network listening status
  const net_listening = async () => {
    const provider = getWalletProvider()
    const listening = await provider.net_listening()
    window.alert('net_listening: ' + listening)
  }

  // Returns current network version
  const net_version = async () => {
    const provider = getWalletProvider()
    const version = await provider.net_version()
    window.alert('net_version: ' + version)
  }

  // Returns client version string
  const web3_clientVersion = async () => {
    const provider = getWalletProvider()
    const version = await provider.web3_clientVersion()
    window.alert('web3_clientVersion: ' + version)
  }

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
      {isConnected ? (
        <>
          {activeChain === 'eip155' && (
            <>
              <div>
                <br />
                <strong>EIP-155 Methods (Wallet):</strong>
              </div>
              <div>
                <button onClick={eth_signMessage}>eth_signMessage</button>
                <button onClick={eth_signTransaction}>eth_signTransaction</button>
                <button onClick={eth_sendTransaction}>eth_sendTransaction</button>
                <button onClick={eth_signTypedData}>eth_signTypedData</button>
                <button
                  onClick={eth_sendRawTransaction}
                  disabled={!signedEthTx}
                  title="Call eth_signTransaction first"
                >
                  eth_sendRawTransaction
                </button>
              </div>
              <div>
                <br />
                <strong>EIP-155 Methods (JSON-RPC Relay):</strong>
              </div>
              <div>
                <div>
                  <button onClick={eth_getBalance}>eth_getBalance</button>
                  <button onClick={eth_blockNumber}>eth_blockNumber</button>
                  <button onClick={eth_call}>eth_call</button>
                  <button onClick={eth_feeHistory}>eth_feeHistory</button>
                  <button onClick={eth_gasPrice}>eth_gasPrice</button>
                  <button onClick={eth_getCode}>eth_getCode</button>
                  <button onClick={eth_getBlockByHash}>eth_getBlockByHash</button>
                  <button onClick={eth_getBlockByNumber}>eth_getBlockByNumber</button>
                  <button onClick={eth_getBlockTransactionCountByHash}>
                    eth_getBlockTxCountByHash
                  </button>
                  <button onClick={eth_getBlockTransactionCountByNumber}>
                    eth_getBlockTxCountByNumber
                  </button>
                  <button onClick={eth_getFilterLogs}>eth_getFilterLogs</button>
                  <button onClick={eth_getFilterChanges}>eth_getFilterChanges</button>
                  <button onClick={eth_getLogs}>eth_getLogs</button>
                  <button onClick={eth_getStorageAt}>eth_getStorageAt</button>
                  <button onClick={eth_getTransactionByBlockHashAndIndex}>
                    eth_getTxByBlockHashAndIndex
                  </button>
                  <button onClick={eth_getTransactionByBlockNumberAndIndex}>
                    eth_getTxByBlockNumberAndIndex
                  </button>
                  <button onClick={eth_getTransactionByHash}>eth_getTransactionByHash</button>
                  <button onClick={eth_getTransactionCount}>eth_getTransactionCount</button>
                  <button onClick={eth_getTransactionReceipt}>eth_getTransactionReceipt</button>
                  <button onClick={eth_maxPriorityFeePerGas}>eth_maxPriorityFeePerGas</button>
                  <button onClick={eth_mining}>eth_mining</button>
                  <button onClick={eth_newBlockFilter}>eth_newBlockFilter</button>
                  <button onClick={eth_newFilter}>eth_newFilter</button>
                  <button onClick={eth_submitWork}>eth_submitWork</button>
                  <button onClick={eth_syncing}>eth_syncing</button>
                  <button onClick={eth_uninstallFilter}>eth_uninstallFilter</button>
                  <button onClick={net_listening}>net_listening</button>
                  <button onClick={net_version}>net_version</button>
                  <button onClick={web3_clientVersion}>web3_clientVersion</button>
                </div>
              </div>
            </>
          )}
          {activeChain == ('hedera' as ChainNamespace) && (
            <>
              <div>
                <br />
                <strong>HIP-820 Methods:</strong>
              </div>
              <div>
                <button onClick={hedera_getNodeAddresses}>hedera_getNodeAddresses</button>
                <button onClick={hedera_signMessage}>hedera_signMessage</button>
                <button onClick={hedera_signTransaction}>hedera_signTransaction</button>
                <button
                  onClick={hedera_executeTransaction}
                  disabled={!signedHederaTx}
                  title="Call hedera_signTransaction first"
                >
                  hedera_executeTransaction
                </button>
                <button onClick={hedera_signAndExecuteQuery}>hedera_signAndExecuteQuery</button>
                <button onClick={hedera_signAndExecuteTransaction}>
                  hedera_signAndExecuteTransaction
                </button>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
