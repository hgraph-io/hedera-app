interface V2NamespaceModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (namespace: 'hedera' | 'eip155' | 'both') => void
}

export function V2NamespaceModal({ isOpen, onClose, onConnect }: V2NamespaceModalProps) {
  const handleSelection = (namespace: 'hedera' | 'eip155' | 'both') => {
    onConnect(namespace)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <h2>Select Namespace</h2>
        <div style={{ padding: '20px' }}>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Choose which protocol namespace to use for your connection:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button
              onClick={() => handleSelection('both')}
              style={{
                padding: '15px',
                backgroundColor: '#7B3FF2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                textAlign: 'left',
              }}
            >
              <strong>Both (Recommended)</strong>
              <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.9 }}>
                Support both native Hedera and EVM-compatible operations
              </div>
            </button>

            <button
              onClick={() => handleSelection('hedera')}
              style={{
                padding: '15px',
                backgroundColor: '#fff',
                color: '#333',
                border: '2px solid #7B3FF2',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                textAlign: 'left',
              }}
            >
              <strong>Native Hedera Only</strong>
              <div style={{ fontSize: '14px', marginTop: '5px', color: '#666' }}>
                Use Hedera-specific operations (HIP-820)
              </div>
            </button>

            <button
              onClick={() => handleSelection('eip155')}
              style={{
                padding: '15px',
                backgroundColor: '#fff',
                color: '#333',
                border: '2px solid #7B3FF2',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                textAlign: 'left',
              }}
            >
              <strong>EVM Only</strong>
              <div style={{ fontSize: '14px', marginTop: '5px', color: '#666' }}>
                Use Ethereum-compatible operations (EIP-155)
              </div>
            </button>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            <strong>Note:</strong> Native Hedera namespace supports all account types (Ed25519 and
            ECDSA), while EVM namespace only supports ECDSA accounts.
          </div>
        </div>
      </div>
    </div>
  )
}

