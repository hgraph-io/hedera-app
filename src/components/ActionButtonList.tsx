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
    wallet: Wallet.createRandom().address, // example address
  },
  to: {
    name: 'Bob',
    wallet: Wallet.createRandom().address, // example address
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

  const getwalletProvider = () => {
    if (!walletProvider) throw Error('user is disconnected')
    return walletProvider as HederaWalletConnectProvider
  }

  const hedera_getNodeAddresses = async () => {
    const walletProvider = getwalletProvider()
    const result = await walletProvider.hedera_getNodeAddresses()

    window.alert('Node addresses: ' + JSON.stringify(result.nodes))
    sendNodeAddresses(result.nodes)
  }

  const hedera_executeTransaction = async () => {
    const walletProvider = getwalletProvider()
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
    const walletProvider = getwalletProvider()

    const params: SignMessageParams = {
      signerAccountId: 'hedera:testnet:' + address,
      message: 'Test Message for AppKit Example',
    }

    const { signatureMap } = await walletProvider.hedera_signMessage(params)

    window.alert('Signed message: ' + signatureMap)
    sendSignMsg(signatureMap)
  }

  const hedera_signTransaction = async () => {
    const walletProvider = getwalletProvider()

    const accountId = address!
    const hbarAmount = new Hbar(Number(1))
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId!))
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
    const walletProvider = getwalletProvider()
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
    const walletProvider = getwalletProvider()

    const accountId = address!
    const hbarAmount = new Hbar(Number(1))
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId!))
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
    const walletProvider = getwalletProvider()
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
    const walletProvider = getwalletProvider()
    if (!address) throw Error('user is disconnected')

    const provider = new BrowserProvider(walletProvider, chainId)
    const signer = new JsonRpcSigner(provider, address)
    const sig = await signer?.signMessage('Hello Reown AppKit!')
    window.alert('Message signature: ' + sig)
    sendSignMsg(sig)
  }

  // function to sign a tx
  const eth_signTransaction = async () => {
    const walletProvider = getwalletProvider()
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
    // You might send this rawSignedTx back to your server or store it
    setSignedEthTx(rawSignedTx)
  }

  // send raw signed transaction
  const eth_sendRawTransaction = async () => {
    if (!signedEthTx) throw Error('No raw transaction found!')

    const walletProvider = getwalletProvider()
    if (!address) throw Error('user is disconnected')

    const provider = new BrowserProvider(walletProvider, chainId)
    // Broadcast the raw signed transaction to the network
    const txHash = await provider.send('eth_sendRawTransaction', [signedEthTx])

    window.alert('Transaction hash: ' + txHash)
    setSignedEthTx(undefined)
    sendHash(txHash)
  }

  // function to sign typed data
  const eth_signTypedData = async () => {
    const walletProvider = getwalletProvider()
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
        verifyingContract: Wallet.createRandom().address, // example address
      }
      const signature = await signer.signTypedData(domain, types, message)
      window.alert('Typed data signature: ' + signature)
      sendSignMsg(signature)
    } catch (err) {
      alert('Error signing typed data:' + err)
    }
  }

  // function to get the balance
  const eth_getBalance = async () => {
    const walletProvider = getwalletProvider()
    if (!address) throw Error('user is disconnected')
    const provider = new BrowserProvider(walletProvider, chainId)
    const balance = await provider.getBalance(address)
    const hbar = formatEther(balance)

    window.alert(`Balance: ${hbar}ℏ`)
    sendBalance(`${hbar}ℏ`)
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
          {activeChain == 'eip155' && (
            <>
              <div>
                <br />
                <strong>EIP-155 Methods:</strong>
              </div>
              <div>
                <button onClick={eth_getBalance}>eth_getBalance</button>
                <button onClick={eth_signMessage}>eth_signMessage</button>
                <button onClick={eth_signTransaction}>eth_signTransaction</button>
                <button
                  onClick={eth_sendRawTransaction}
                  disabled={!signedEthTx}
                  title="Call eth_signTransaction first"
                >
                  eth_sendRawTransaction
                </button>
                <button onClick={eth_sendTransaction}>eth_sendTransaction</button>
                <button onClick={eth_signTypedData}>eth_signTypedData</button>
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
