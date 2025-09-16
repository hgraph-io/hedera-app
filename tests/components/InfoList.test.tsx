import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InfoList } from '../../src/components/InfoList'

vi.mock('@reown/appkit/react', () => ({
  useAppKitState: () => ({
    activeChain: 'eip155',
    loading: false,
    open: false,
    selectedNetworkId: 'eip155:296',
  }),
  useAppKitTheme: () => ({
    themeMode: 'light',
    themeVariables: {},
  }),
  useAppKitAccount: () => ({
    address: '0xabc',
    caipAddress: 'eip155:1:0xabc',
    isConnected: true,
    status: 'connected',
  }),
  useWalletInfo: () => ({
    walletInfo: { name: 'TestWallet' },
  }),
  useAppKitProvider: () => ({
    walletProvider: null,
  }),
  useAppKitNetworkCore: () => ({
    chainId: 296,
  }),
}))

describe('InfoList', () => {
  it('renders without hash', () => {
    render(
      <InfoList
        hash=""
        txId=""
        signedMsg=""
        nodes={[]}
        lastFunctionResult={null}
        connectionMode="v2"
      />,
    )
    expect(screen.queryByText('Transaction')).not.toBeInTheDocument()
  })

  it('renders signature', () => {
    render(
      <InfoList
        hash=""
        txId=""
        signedMsg="signature123"
        nodes={[]}
        lastFunctionResult={null}
        connectionMode="v2"
      />,
    )
    expect(screen.getByText('Signature of message')).toBeInTheDocument()
  })

  it('renders nodes', () => {
    render(
      <InfoList
        hash=""
        txId=""
        signedMsg=""
        nodes={['node1', 'node2']}
        lastFunctionResult={null}
        connectionMode="v2"
      />,
    )
    expect(screen.getByText('Nodes')).toBeInTheDocument()
  })

  it('renders function result', () => {
    render(
      <InfoList
        hash=""
        txId=""
        signedMsg=""
        nodes={[]}
        lastFunctionResult={{ functionName: 'test', result: 'success' }}
        connectionMode="v2"
      />,
    )
    expect(screen.getByText('Last Function Result')).toBeInTheDocument()
  })

  it('renders without v2 specific info when connectionMode is not v2', () => {
    render(
      <InfoList
        hash=""
        txId=""
        signedMsg=""
        nodes={[]}
        lastFunctionResult={null}
        connectionMode="none"
      />,
    )
    expect(screen.queryByText('useAppKit')).not.toBeInTheDocument()
    expect(screen.queryByText('Theme')).not.toBeInTheDocument()
    expect(screen.queryByText('State')).not.toBeInTheDocument()
    expect(screen.queryByText('WalletInfo')).not.toBeInTheDocument()
  })
})
