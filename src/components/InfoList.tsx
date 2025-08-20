import { useEffect, useState } from 'react'
import {
  useAppKitState,
  useAppKitTheme,
  useAppKitAccount,
  useWalletInfo,
  useAppKitProvider,
  useAppKitNetworkCore,
} from '@reown/appkit/react'
import { HederaProvider } from '@hashgraph/hedera-wallet-connect'
import { FunctionResult } from '../App'

interface InfoListProps {
  hash: string
  txId: string
  signedMsg: string
  nodes: string[]
  lastFunctionResult: FunctionResult | null
  connectionMode?: 'none' | 'v1' | 'v2'
}

export const InfoList = ({
  hash,
  txId,
  signedMsg,
  nodes,
  lastFunctionResult,
  connectionMode = 'none',
}: InfoListProps) => {
  const [statusEthTx, setStatusEthTx] = useState('')
  const { themeMode, themeVariables } = useAppKitTheme()
  const state = useAppKitState()
  const { chainId } = useAppKitNetworkCore()
  const { address, caipAddress, isConnected, status } = useAppKitAccount()
  const walletInfo = useWalletInfo()
  const { walletProvider } = useAppKitProvider<HederaProvider>('eip155')
  const isEthChain = state.activeChain == 'eip155'

  useEffect(() => {
    const checkTransactionStatus = async () => {
      if (!walletProvider || chainId === undefined) return
      if (isEthChain && hash) {
        try {
          const rpcProvider = (
            walletProvider.rpcProviders as unknown as Record<
              string,
              Record<
                string,
                Record<
                  number,
                  {
                    request: (params: { method: string; params: unknown[] }) => Promise<unknown>
                  }
                >
              >
            >
          )?.eip155?.httpProviders?.[chainId as number]
          const receipt = await rpcProvider.request({
            method: 'eth_getTransactionReceipt',
            params: [hash],
          })
          const receiptWithStatus = receipt as { status?: number } | null
          setStatusEthTx(
            receiptWithStatus?.status === 1
              ? 'Success'
              : receiptWithStatus?.status === 0
                ? 'Failed'
                : 'Pending',
          )
        } catch (err) {
          console.error('Error checking transaction status:', err)
          setStatusEthTx('Error')
        }
      }
    }
    checkTransactionStatus()
  }, [hash, walletProvider, chainId, state.activeChain, txId, isEthChain])

  return (
    <>
      {lastFunctionResult && (
        <section>
          <h2>Last Function Result</h2>
          <pre style={{ wordBreak: 'break-all' }}>
            Function: {lastFunctionResult.functionName}
            <br />
            Result: {lastFunctionResult.result}
          </pre>
        </section>
      )}

      {hash && isEthChain && (
        <section>
          <h2>Transaction</h2>
          <pre>
            Hash:{' '}
            <a
              href={`https://hashscan.io/${
                state.selectedNetworkId?.toString() == 'eip155:296' ? 'testnet/' : ''
              }transaction/${hash}`}
              target="_blank"
            >
              {hash}
            </a>
            <br />
            Status: {statusEthTx}
            <br />
          </pre>
        </section>
      )}

      {txId && !isEthChain && (
        <section>
          <h2>Transaction</h2>
          <pre>
            Id:
            <a
              href={`https://hashscan.io/${
                state.selectedNetworkId?.toString() == 'hedera:testnet' ? 'testnet/' : ''
              }transaction/${txId}`}
              target="_blank"
            >
              {txId}
            </a>
            <br />
          </pre>
        </section>
      )}

      {signedMsg && (
        <section>
          <h2>Signature of message</h2>
          <pre>
            {signedMsg}
            <br />
          </pre>
        </section>
      )}

      {connectionMode === 'v2' && (
        <section>
          <h2>useAppKit</h2>
          <pre>
            Address: {address}
            <br />
            caip Address: {caipAddress}
            <br />
            Connected: {isConnected.toString()}
            <br />
            Status: {status}
            <br />
          </pre>
        </section>
      )}

      {connectionMode === 'v2' && (
        <section>
          <h2>Theme</h2>
          <pre>
            Theme: {themeMode}
            <br />
            ThemeVariables: {JSON.stringify(themeVariables, null, 2)}
            <br />
          </pre>
        </section>
      )}

      {connectionMode === 'v2' && (
        <section>
          <h2>State</h2>
          <pre>
            activeChain: {state.activeChain}
            <br />
            loading: {state.loading.toString()}
            <br />
            open: {state.open.toString()}
            <br />
            selectedNetworkId: {state.selectedNetworkId?.toString()}
            <br />
          </pre>
        </section>
      )}

      {connectionMode === 'v2' && (
        <section>
          <h2>WalletInfo</h2>
          <pre>
            Name: {walletInfo.walletInfo?.name?.toString()}
            <br />
          </pre>
        </section>
      )}

      {nodes.length > 0 && (
        <section>
          <h2>Nodes</h2>
          {nodes.map((node) => (
            <pre key={node}>
              {node}
              <br />
            </pre>
          ))}
        </section>
      )}
    </>
  )
}
