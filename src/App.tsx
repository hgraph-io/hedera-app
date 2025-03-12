import './App.css'
import { useState } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { HederaChainDefinition } from '@hashgraph/hedera-wallet-connect'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import {
  projectId,
  metadata,
  networks,
  nativeHederaAdapter,
  eip155HederaAdapter,
  universalProvider,
} from './config'

// Create modal
createAppKit({
  adapters: [nativeHederaAdapter, eip155HederaAdapter],
  universalProvider,
  defaultNetwork: HederaChainDefinition.Native.Testnet,
  projectId,
  metadata,
  networks,
  themeMode: 'light' as const,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    socials: false,
    swaps: false,
    onramp: false,
    email: false,
  },
})

export function App() {
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [signedMsg, setSignedMsg] = useState('')
  const [balance, setBalance] = useState('')
  const [nodes, setNodes] = useState<string[]>([])

  const receiveHash = (hash: string) => {
    setTransactionHash(hash) // Update the state with the transaction hash
  }

  const receiveTxId = (hash: string) => {
    setTransactionId(hash) // Update the state with the transaction id
  }

  const receiveSignedMsg = (signedMsg: string) => {
    setSignedMsg(signedMsg) // Update the state with the signature
  }

  const receivebalance = (balance: string) => {
    setBalance(balance) // Update the state with the balance
  }

  const receiveNodes = (nodes: string[]) => {
    setNodes(nodes) // Update the state with the node addresses
  }

  return (
    <div className="pages">
      <div className="logos">
        <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
        <img src="/hedera.svg" alt="Hedera" style={{ width: '90px', height: '90px' }} />
      </div>

      <h1>AppKit EIP-155 & HIP-820 Hedera React dApp Example</h1>

      <ActionButtonList
        sendHash={receiveHash}
        sendTxId={receiveTxId}
        sendSignMsg={receiveSignedMsg}
        sendBalance={receivebalance}
        sendNodeAddresses={receiveNodes}
      />
      <div className="advice">
        <p>
          Go to{' '}
          <a
            href="https://cloud.reown.com"
            target="_blank"
            className="link-button"
            rel="Reown Cloud"
          >
            Reown Cloud
          </a>{' '}
          to get projectId.
        </p>
      </div>
      <InfoList
        hash={transactionHash}
        txId={transactionId}
        signedMsg={signedMsg}
        balance={balance}
        nodes={nodes}
      />
    </div>
  )
}

export default App
