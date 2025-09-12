import { useState } from 'react'
import {
  BrowserProvider,
  formatEther,
  JsonRpcSigner,
  JsonRpcProvider,
  parseEther,
  getBigInt,
  hexlify,
  toQuantity,
  BigNumberish,
  TypedDataField,
} from 'ethers'
import { HederaProvider } from '@hashgraph/hedera-wallet-connect'
import { eip712Types } from '../utils/eip712'
import { toEvmAddress } from '../utils/hedera'

export interface EthSendTransactionParams {
  to: string
  value: string
  gasLimit: string
}
export interface EthSignMessageParams {
  message: string
}
export interface EthCallParams {
  to: string
  data: string
}
export interface EthFeeHistoryParams {
  blockCount: string
  newestBlock: string
}
export interface EthGetCodeParams {
  address: string
  blockTag: string
}
export interface EthGetStorageAtParams {
  address: string
  position: string
  blockTag: string
}
export interface EthGetTransactionByHashParams {
  hash: string
}
export interface EthGetTransactionByBlockHashAndIndexParams {
  blockHash: string
  index: string
}
export interface EthGetTransactionByBlockNumberAndIndexParams {
  blockNumber: string
  index: string
}
export interface EthGetBlockByHashParams {
  blockHash: string
  includeTransactions: string
}
export interface EthGetBlockByNumberParams {
  blockTag: string
  includeTransactions?: string
}
export interface EthGetBlockTransactionCountByHashParams {
  blockHash: string
}
export interface EthGetBlockTransactionCountByNumberParams {
  blockTag: string
}
export interface EthGetLogsParams {
  address: string
  fromBlock: string
  toBlock: string
}
export type EthNewFilterParams = EthGetLogsParams
export interface EthUninstallFilterParams {
  filterId: string
}
export interface EthFilterParams {
  filterId: string
}
export interface EthSignTypedDataParams {
  domain: string
  version: string
  verifyingContract: string
  from_name: string
  from_wallet: string
  to_name: string
  to_wallet: string
  contents: string
}

export type EthMethodParams =
  | EthSendTransactionParams
  | EthSignMessageParams
  | EthCallParams
  | EthFeeHistoryParams
  | EthGetCodeParams
  | EthGetStorageAtParams
  | EthGetTransactionByHashParams
  | EthGetTransactionByBlockHashAndIndexParams
  | EthGetTransactionByBlockNumberAndIndexParams
  | EthGetBlockByHashParams
  | EthGetBlockByNumberParams
  | EthGetBlockTransactionCountByHashParams
  | EthGetBlockTransactionCountByNumberParams
  | EthGetLogsParams
  | EthNewFilterParams
  | EthUninstallFilterParams
  | EthFilterParams
  | EthSignTypedDataParams
  | Record<string, string>

interface UseEthereumMethodsProps {
  walletProvider?: HederaProvider
  chainId?: number
  address?: string
  ethTxHash: string
  sendHash: (hash: string) => void
  sendSignMsg: (msg: string) => void
  jsonRpcProvider?: JsonRpcProvider
}

export const useEthereumMethods = ({
  walletProvider,
  chainId,
  address,
  ethTxHash,
  sendHash,
  sendSignMsg,
  jsonRpcProvider,
}: UseEthereumMethodsProps) => {
  const [signedEthTx, setSignedEthTx] = useState<string>()

  const browserProvider =
    walletProvider && chainId ? new BrowserProvider(walletProvider, chainId) : undefined
  const signer =
    walletProvider && address && browserProvider
      ? new JsonRpcSigner(browserProvider, address)
      : undefined
  const rpcProvider =
    walletProvider && chainId
      ? (
          walletProvider.rpcProviders as unknown as Record<
            string,
            Record<
              string,
              Record<
                number,
                { request: (params: { method: string; params: unknown[] }) => Promise<unknown> }
              >
            >
          >
        )?.eip155?.httpProviders?.[chainId]
      : jsonRpcProvider
        ? {
            request: ({ method, params }: { method: string; params: unknown[] }) =>
              jsonRpcProvider.send(method, params as never[]),
          }
        : undefined

  const execute = async (methodName: string, params: Record<string, string>) => {
    if (!rpcProvider) {
      throw new Error(
        `No RPC provider available for chain ${chainId}. Please ensure you are connected with the correct namespace (eip155) and chain.`,
      )
    }

    switch (methodName) {
      case 'eth_getBalance': {
        const balance = await rpcProvider.request({
          method: 'eth_getBalance',
          params: [(params as Record<string, string>).address, 'latest'],
        })
        return formatEther(getBigInt(balance as BigNumberish))
      }
      case 'eth_chainId': {
        return await rpcProvider.request({ method: 'eth_chainId', params: [] })
      }
      case 'eth_blockNumber': {
        const bn = await rpcProvider.request({
          method: 'eth_blockNumber',
          params: [],
        })
        return getBigInt(bn as BigNumberish)
      }
      case 'eth_feeHistory': {
        const p = params as unknown as EthFeeHistoryParams
        const history = await rpcProvider.request({
          method: 'eth_feeHistory',
          params: [toQuantity(+p.blockCount), p.newestBlock, [] as number[]],
        })
        return JSON.stringify(history)
      }
      case 'eth_gasPrice': {
        const price = (await rpcProvider.request({
          method: 'eth_gasPrice',
          params: [],
        })) as BigNumberish
        return getBigInt(price)
      }
      case 'eth_sendTransaction': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSendTransactionParams
        const tx = {
          to: toEvmAddress(p.to),
          value: parseEther(p.value),
          gasLimit: getBigInt(p.gasLimit),
        }
        const txResponse = await signer.sendTransaction(tx)
        sendHash(txResponse.hash)
        return txResponse.hash
      }
      case 'eth_signTransaction': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSendTransactionParams
        const tx = {
          to: toEvmAddress(p.to),
          value: parseEther(p.value),
          gasLimit: getBigInt(p.gasLimit),
        }
        const serializedTx = await signer.signTransaction(tx)
        setSignedEthTx(serializedTx)
        return serializedTx
      }
      case 'eth_sendRawTransaction': {
        if (!signedEthTx) throw Error('Transaction not signed, use eth_signTransaction first')
        const txHash = await rpcProvider.request({
          method: 'eth_sendRawTransaction',
          params: [signedEthTx],
        })
        setSignedEthTx(undefined)
        sendHash(txHash as string)
        return txHash
      }
      case 'eth_signMessage': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSignMessageParams
        const signature = await signer.signMessage(p.message)
        sendSignMsg(signature)
        return signature
      }
      case 'personal_sign': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSignMessageParams
        // personal_sign expects the message as the first param and address as second
        // but we handle it the same way as eth_signMessage
        const signature = await signer.signMessage(p.message)
        sendSignMsg(signature)
        return signature
      }
      case 'eth_sign': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSignMessageParams
        // eth_sign is similar to personal_sign but less secure
        // Most wallets will show a warning for eth_sign
        const signature = await (
          signer as JsonRpcSigner & { _signMessage: (message: string) => Promise<string> }
        )._signMessage(p.message)
        sendSignMsg(signature)
        return signature
      }
      case 'eth_call': {
        const p = params as unknown as EthCallParams
        return rpcProvider.request({
          method: 'eth_call',
          params: [{ to: p.to, data: p.data }, 'latest'],
        })
      }
      case 'eth_getCode': {
        const p = params as unknown as EthGetCodeParams
        return rpcProvider.request({
          method: 'eth_getCode',
          params: [p.address, p.blockTag],
        })
      }
      case 'eth_getStorageAt': {
        const p = params as unknown as EthGetStorageAtParams
        return rpcProvider.request({
          method: 'eth_getStorageAt',
          params: [p.address, p.position, p.blockTag],
        })
      }
      case 'eth_getTransactionByHash': {
        const p = params as unknown as EthGetTransactionByHashParams
        const hash = p.hash || ethTxHash
        const tx = await rpcProvider.request({
          method: 'eth_getTransactionByHash',
          params: [hash],
        })
        return tx ? JSON.stringify(tx) : 'Transaction not found'
      }
      case 'eth_getTransactionCount': {
        const count = await rpcProvider.request({
          method: 'eth_getTransactionCount',
          params: [address, 'latest'],
        })
        return getBigInt(count as BigNumberish)
      }
      case 'eth_getTransactionReceipt': {
        const p = params as unknown as EthGetTransactionByHashParams
        const hash = p.hash || ethTxHash
        const receipt = await rpcProvider.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        })
        return receipt ? JSON.stringify(receipt) : 'Receipt not found'
      }
      case 'eth_maxPriorityFeePerGas': {
        const fee = await rpcProvider.request({
          method: 'eth_maxPriorityFeePerGas',
          params: [],
        })
        return getBigInt(fee as BigNumberish)
      }
      case 'eth_getBlockByHash': {
        const p = params as unknown as EthGetBlockByHashParams
        return (
          (await rpcProvider.request({
            method: 'eth_getBlockByHash',
            params: [p.blockHash, p.includeTransactions === 'true'],
          })) || 'Block not found'
        )
      }
      case 'eth_getBlockByNumber': {
        const p = params as unknown as EthGetBlockByNumberParams
        return (
          (await rpcProvider.request({
            method: 'eth_getBlockByNumber',
            params: [
              p.blockTag,
              (p as EthGetBlockByNumberParams & { includeTransactions?: string })
                .includeTransactions === 'true',
            ],
          })) || 'Block not found'
        )
      }
      case 'eth_getBlockTransactionCountByHash': {
        const p = params as unknown as EthGetBlockTransactionCountByHashParams
        const count = await rpcProvider.request({
          method: 'eth_getBlockTransactionCountByHash',
          params: [p.blockHash],
        })
        return getBigInt(count as BigNumberish)
      }
      case 'eth_getBlockTransactionCountByNumber': {
        const p = params as unknown as EthGetBlockTransactionCountByNumberParams
        const count = await rpcProvider.request({
          method: 'eth_getBlockTransactionCountByNumber',
          params: [p.blockTag],
        })
        return getBigInt(count as BigNumberish)
      }
      case 'eth_getFilterLogs': {
        const p = params as unknown as EthFilterParams
        const logs = await rpcProvider.request({
          method: 'eth_getFilterLogs',
          params: [p.filterId],
        })
        return JSON.stringify(logs)
      }
      case 'eth_getFilterChanges': {
        const p = params as unknown as EthFilterParams
        const changes = await rpcProvider.request({
          method: 'eth_getFilterChanges',
          params: [p.filterId],
        })
        return JSON.stringify(changes)
      }
      case 'eth_getTransactionByBlockHashAndIndex': {
        const p = params as unknown as EthGetTransactionByBlockHashAndIndexParams
        const tx = await rpcProvider.request({
          method: 'eth_getTransactionByBlockHashAndIndex',
          params: [p.blockHash, p.index],
        })
        return JSON.stringify(tx)
      }
      case 'eth_getTransactionByBlockNumberAndIndex': {
        const p = params as unknown as EthGetTransactionByBlockNumberAndIndexParams
        const tx = await rpcProvider.request({
          method: 'eth_getTransactionByBlockNumberAndIndex',
          params: [p.blockNumber, p.index],
        })
        return JSON.stringify(tx)
      }
      case 'eth_getLogs': {
        const p = params as unknown as EthGetLogsParams
        const filter = {
          address: hexlify(p.address),
          fromBlock: p.fromBlock,
          toBlock: p.toBlock,
        }
        return rpcProvider.request({ method: 'eth_getLogs', params: [filter] })
      }
      case 'eth_mining': {
        return rpcProvider.request({ method: 'eth_mining', params: [] })
      }
      case 'eth_newBlockFilter': {
        return rpcProvider.request({ method: 'eth_newBlockFilter', params: [] })
      }
      case 'eth_newFilter': {
        const p = params as unknown as EthNewFilterParams
        const filter = {
          address: hexlify(p.address),
          fromBlock: p.fromBlock,
          toBlock: p.toBlock,
        }
        return rpcProvider.request({ method: 'eth_newFilter', params: [filter] })
      }
      case 'eth_syncing': {
        return rpcProvider.request({ method: 'eth_syncing', params: [] })
      }
      case 'eth_uninstallFilter': {
        const p = params as unknown as EthUninstallFilterParams
        return rpcProvider.request({
          method: 'eth_uninstallFilter',
          params: [p.filterId],
        })
      }
      case 'net_listening': {
        return rpcProvider.request({ method: 'net_listening', params: [] })
      }
      case 'net_version': {
        return rpcProvider.request({ method: 'net_version', params: [] })
      }
      case 'web3_clientVersion': {
        return rpcProvider.request({ method: 'web3_clientVersion', params: [] })
      }
      case 'eth_signTypedData': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSignTypedDataParams
        const domain = {
          name: p.domain,
          version: p.version,
          chainId,
          verifyingContract: p.verifyingContract,
        }
        const value = {
          from: { name: p.from_name, wallet: p.from_wallet },
          to: { name: p.to_name, wallet: p.to_wallet },
          contents: p.contents,
        }
        const signature = await signer.signTypedData(
          domain,
          eip712Types as unknown as Record<string, TypedDataField[]>,
          value,
        )
        sendSignMsg(signature)
        return signature
      }
      case 'eth_signTypedData_v3': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSignTypedDataParams
        const domain = {
          name: p.domain,
          version: p.version,
          chainId,
          verifyingContract: p.verifyingContract,
        }
        const value = {
          from: { name: p.from_name, wallet: p.from_wallet },
          to: { name: p.to_name, wallet: p.to_wallet },
          contents: p.contents,
        }
        // v3 uses the same method as v4 in ethers
        const signature = await signer.signTypedData(
          domain,
          eip712Types as unknown as Record<string, TypedDataField[]>,
          value,
        )
        sendSignMsg(signature)
        return signature
      }
      case 'eth_signTypedData_v4': {
        if (!signer) throw new Error('Wallet not connected')
        const p = params as unknown as EthSignTypedDataParams
        const domain = {
          name: p.domain,
          version: p.version,
          chainId,
          verifyingContract: p.verifyingContract,
        }
        const value = {
          from: { name: p.from_name, wallet: p.from_wallet },
          to: { name: p.to_name, wallet: p.to_wallet },
          contents: p.contents,
        }
        // v4 is the standard implementation
        const signature = await signer.signTypedData(
          domain,
          eip712Types as unknown as Record<string, TypedDataField[]>,
          value,
        )
        sendSignMsg(signature)
        return signature
      }
      default:
        throw new Error(`Unsupported Ethereum method: ${methodName}`)
    }
  }

  return { executeEthMethod: execute }
}
