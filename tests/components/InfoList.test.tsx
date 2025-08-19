import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, beforeEach, expect, vi } from 'vitest'
import React from 'react'

let activeChain: string
let walletProvider: any
let selectedNetworkId: string
let chainId: number | undefined

vi.mock('ethers', () => ({}))

vi.mock('@reown/appkit/react', () => ({
  useAppKitTheme: () => ({ themeMode: 'light', themeVariables: { c: '1' } }),
  useAppKitState: () => ({ activeChain, loading: false, open: false, selectedNetworkId }),
  useAppKitAccount: () => ({
    address: '0xabc',
    caipAddress: 'eip155:1:0xabc',
    isConnected: true,
    status: 'connected',
  }),
  useAppKitProvider: () => ({ walletProvider }),
  useWalletInfo: () => ({ walletInfo: { name: 'wallet' } }),
  useAppKitNetworkCore: () => ({ chainId }),
}))

beforeEach(() => {
  activeChain = 'eip155'
  selectedNetworkId = 'hedera:testnet'
  chainId = 1
  walletProvider = {
    rpcProviders: {
      eip155: { httpProviders: { 1: { request: vi.fn(async () => ({ status: 1 })) } } },
    },
  }
})

describe('InfoList', () => {
  it('shows transaction status for eth tx', async () => {
    const { InfoList } = await import('../../src/components/InfoList')
    render(<InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />)
    await waitFor(() => {
      expect(screen.getByText(/Status: Success/)).toBeInTheDocument()
    })
  })

  it('shows nodes and last result', async () => {
    const { InfoList } = await import('../../src/components/InfoList')
    activeChain = 'hedera'
    render(
      <InfoList
        hash=""
        txId="tx"
        signedMsg="sig"
        nodes={['n1']}
        lastFunctionResult={{ functionName: 'f', result: 'r' }}
      />,
    )
    expect(screen.getByText('Last Function Result')).toBeInTheDocument()
    expect(screen.getByText('n1')).toBeInTheDocument()
  })

  it('handles transaction status check error', async () => {
    activeChain = 'eip155'
    walletProvider = {
      rpcProviders: {
        eip155: {
          httpProviders: {
            1: {
              request: vi.fn().mockRejectedValue(new Error('RPC Error')),
            },
          },
        },
      },
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { InfoList } = await import('../../src/components/InfoList')
    render(<InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />)

    await waitFor(() => {
      expect(screen.getByText(/Status: Error/)).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error checking transaction status:',
      expect.any(Error),
    )
    consoleSpy.mockRestore()
  })

  it('shows failed transaction status', async () => {
    walletProvider = {
      rpcProviders: {
        eip155: { httpProviders: { 1: { request: vi.fn(async () => ({ status: 0 })) } } },
      },
    }

    const { InfoList } = await import('../../src/components/InfoList')
    render(<InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />)
    await waitFor(() => {
      expect(screen.getByText(/Status: Failed/)).toBeInTheDocument()
    })
  })

  it('shows pending transaction status', async () => {
    walletProvider = {
      rpcProviders: {
        eip155: { httpProviders: { 1: { request: vi.fn(async () => ({ status: null })) } } },
      },
    }

    const { InfoList } = await import('../../src/components/InfoList')
    render(<InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />)
    await waitFor(() => {
      expect(screen.getByText(/Status: Pending/)).toBeInTheDocument()
    })
  })

  it('skips transaction check when wallet provider or chainId is missing', async () => {
    walletProvider = null

    const { InfoList } = await import('../../src/components/InfoList')
    render(<InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />)

    // Should show status but without value since check is skipped
    await waitFor(() => {
      const transactionSection = screen.getByText('Transaction').closest('section')
      const statusText = transactionSection?.querySelector('pre')?.textContent
      expect(statusText).toContain('Status:')
      expect(statusText).not.toContain('Success')
      expect(statusText).not.toContain('Failed')
      expect(statusText).not.toContain('Pending')
    })
  })

  it('shows mainnet hashscan link for eip155 mainnet', async () => {
    selectedNetworkId = 'eip155:295'

    const { InfoList } = await import('../../src/components/InfoList')
    const { rerender } = render(
      <InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />,
    )

    // Wait for any async effects to complete
    await waitFor(() => {
      const link = screen.getByRole('link', { name: '0x1' })
      expect(link).toHaveAttribute('href', 'https://hashscan.io/transaction/0x1')
    })
  })

  it('shows testnet hashscan link for eip155 testnet', async () => {
    selectedNetworkId = 'eip155:296'

    const { InfoList } = await import('../../src/components/InfoList')
    const { rerender } = render(
      <InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />,
    )

    // Wait for any async effects to complete
    await waitFor(() => {
      const link = screen.getByRole('link', { name: '0x1' })
      expect(link).toHaveAttribute('href', 'https://hashscan.io/testnet/transaction/0x1')
    })
  })

  it('shows mainnet hashscan link for hedera mainnet', async () => {
    activeChain = 'hedera'
    selectedNetworkId = 'hedera:mainnet'

    const { InfoList } = await import('../../src/components/InfoList')
    render(<InfoList hash="" txId="tx123" signedMsg="" nodes={[]} lastFunctionResult={null} />)

    const link = screen.getByRole('link', { name: 'tx123' })
    expect(link).toHaveAttribute('href', 'https://hashscan.io/transaction/tx123')
  })

  it('handles undefined chainId', async () => {
    chainId = undefined

    const { InfoList } = await import('../../src/components/InfoList')
    render(<InfoList hash="0x1" txId="" signedMsg="" nodes={[]} lastFunctionResult={null} />)

    // Should not show transaction status since check is skipped
    await waitFor(() => {
      const transactionSection = screen.getByText('Transaction').closest('section')
      const statusText = transactionSection?.querySelector('pre')?.textContent
      expect(statusText).toContain('Status:')
      expect(statusText).not.toContain('Success')
      expect(statusText).not.toContain('Failed')
      expect(statusText).not.toContain('Pending')
    })
  })
})
