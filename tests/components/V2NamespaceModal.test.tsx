import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { V2NamespaceModal } from '../../src/components/V2NamespaceModal'

describe('V2NamespaceModal', () => {
  const mockOnClose = vi.fn()
  const mockOnConnect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    expect(screen.getByText('Select HWC v2 Namespace')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <V2NamespaceModal
        isOpen={false}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    expect(screen.queryByText('Select HWC v2 Namespace')).not.toBeInTheDocument()
  })

  it('displays all three namespace options', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    expect(screen.getByText('Hedera Namespace (hedera:)')).toBeInTheDocument()
    expect(screen.getByText('EIP-155 Namespace (eip155:)')).toBeInTheDocument()
    expect(screen.getByText('Both Namespaces (hedera: + eip155:)')).toBeInTheDocument()
  })

  it('selects hedera namespace by default', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const hederaRadio = screen.getByRole('radio', { name: /Hedera Namespace/i })
    expect(hederaRadio).toBeChecked()
  })

  it('allows selecting eip155 namespace', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const eip155Radio = screen.getByRole('radio', { name: /EIP-155 Namespace/i })
    fireEvent.click(eip155Radio)
    expect(eip155Radio).toBeChecked()
  })

  it('allows selecting both namespaces', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const bothRadio = screen.getByRole('radio', { name: /Both Namespaces/i })
    fireEvent.click(bothRadio)
    expect(bothRadio).toBeChecked()
  })

  it('calls onConnect with hedera when connecting with hedera selected', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const connectButton = screen.getByRole('button', { name: /Connect with Hedera/i })
    fireEvent.click(connectButton)

    expect(mockOnConnect).toHaveBeenCalledWith('hedera')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onConnect with eip155 when connecting with eip155 selected', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const eip155Radio = screen.getByRole('radio', { name: /EIP-155 Namespace/i })
    fireEvent.click(eip155Radio)

    const connectButton = screen.getByRole('button', { name: /Connect with EIP-155/i })
    fireEvent.click(connectButton)

    expect(mockOnConnect).toHaveBeenCalledWith('eip155')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onConnect with both when connecting with both selected', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const bothRadio = screen.getByRole('radio', { name: /Both Namespaces/i })
    fireEvent.click(bothRadio)

    const connectButton = screen.getByRole('button', { name: /Connect with Both/i })
    fireEvent.click(connectButton)

    expect(mockOnConnect).toHaveBeenCalledWith('both')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal when cancel is clicked', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
    expect(mockOnConnect).not.toHaveBeenCalled()
  })

  it('closes modal when clicking outside', () => {
    render(
      <V2NamespaceModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    )

    const overlay = screen.getByText('Select HWC v2 Namespace').closest('.modal-overlay')
    if (overlay) {
      fireEvent.click(overlay)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })
})