import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { V1ConnectionModal } from '../../src/components/V1ConnectionModal'
import { ExtensionData } from '@hashgraph/hedera-wallet-connect'

const mockExtensions: ExtensionData[] = [
  {
    id: 'hashpack',
    name: 'HashPack',
    icon: 'data:image/svg+xml,test',
    available: true,
    availableInIframe: false,
  },
]

describe('V1ConnectionModal', () => {
  it('shows loading state when detecting extensions', () => {
    render(
      <V1ConnectionModal
        isOpen={true}
        onClose={() => {}}
        onConnect={async () => true}
        availableExtensions={[]}
        isDetectingExtensions={true}
      />
    )

    expect(screen.getByText('Detecting browser extensions...')).toBeInTheDocument()
  })

  it('shows available extensions when detection completes', () => {
    render(
      <V1ConnectionModal
        isOpen={true}
        onClose={() => {}}
        onConnect={async () => true}
        availableExtensions={mockExtensions}
        isDetectingExtensions={false}
      />
    )

    expect(screen.getByText('HashPack')).toBeInTheDocument()
  })

  it('shows no extensions message when none are found', () => {
    render(
      <V1ConnectionModal
        isOpen={true}
        onClose={() => {}}
        onConnect={async () => true}
        availableExtensions={[]}
        isDetectingExtensions={false}
      />
    )

    expect(screen.getByText(/No browser extensions detected/)).toBeInTheDocument()
  })

  it('calls onRefreshExtensions when modal opens', () => {
    const mockRefresh = vi.fn()
    
    const { rerender } = render(
      <V1ConnectionModal
        isOpen={false}
        onClose={() => {}}
        onConnect={async () => true}
        availableExtensions={[]}
        onRefreshExtensions={mockRefresh}
      />
    )

    expect(mockRefresh).not.toHaveBeenCalled()

    rerender(
      <V1ConnectionModal
        isOpen={true}
        onClose={() => {}}
        onConnect={async () => true}
        availableExtensions={[]}
        onRefreshExtensions={mockRefresh}
      />
    )

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('handles extension connection', async () => {
    const mockConnect = vi.fn().mockResolvedValue(true)
    const mockClose = vi.fn()

    render(
      <V1ConnectionModal
        isOpen={true}
        onClose={mockClose}
        onConnect={mockConnect}
        availableExtensions={mockExtensions}
        isDetectingExtensions={false}
      />
    )

    const extensionButton = screen.getByText('HashPack')
    fireEvent.click(extensionButton)

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith([mockExtensions[0]])
    })

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled()
    })
  })
})