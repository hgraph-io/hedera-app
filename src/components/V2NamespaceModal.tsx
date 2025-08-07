import { useState } from 'react'

interface V2NamespaceModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (namespace: 'hedera' | 'eip155' | 'both') => void
}

export function V2NamespaceModal({ isOpen, onClose, onConnect }: V2NamespaceModalProps) {
  const [selectedNamespace, setSelectedNamespace] = useState<'hedera' | 'eip155' | 'both'>(
    'hedera',
  )

  if (!isOpen) return null

  const handleConnect = () => {
    onConnect(selectedNamespace)
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <h2>Select HWC v2 Namespace</h2>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Choose the namespace for your wallet connection:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '15px',
                border: '2px solid',
                borderColor: selectedNamespace === 'hedera' ? '#7B3FF2' : '#ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedNamespace === 'hedera' ? '#f8f5ff' : 'white',
              }}
            >
              <input
                type="radio"
                name="namespace"
                value="hedera"
                checked={selectedNamespace === 'hedera'}
                onChange={() => setSelectedNamespace('hedera')}
                style={{ marginTop: '2px' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '16px', display: 'block', marginBottom: '5px' }}>
                  Hedera Namespace (hedera:)
                </strong>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Native Hedera protocol for full functionality
                </div>
                <ul style={{ fontSize: '13px', color: '#666', margin: 0, paddingLeft: '20px' }}>
                  <li>Supports all Hedera account types (Ed25519 & ECDSA)</li>
                  <li>Native Hedera transactions and queries</li>
                  <li>Full HIP-820 compliance</li>
                  <li style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                    ❌ HashPack does not support this namespace in WalletConnect v2
                  </li>
                  <li style={{ color: '#666' }}>
                    Other wallets may support this in the future
                  </li>
                </ul>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '15px',
                border: '2px solid',
                borderColor: selectedNamespace === 'eip155' ? '#7B3FF2' : '#ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedNamespace === 'eip155' ? '#f8f5ff' : 'white',
              }}
            >
              <input
                type="radio"
                name="namespace"
                value="eip155"
                checked={selectedNamespace === 'eip155'}
                onChange={() => setSelectedNamespace('eip155')}
                style={{ marginTop: '2px' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '16px', display: 'block', marginBottom: '5px' }}>
                  EIP-155 Namespace (eip155:)
                </strong>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Ethereum compatibility layer
                </div>
                <ul style={{ fontSize: '13px', color: '#666', margin: 0, paddingLeft: '20px' }}>
                  <li>ECDSA accounts only (no Ed25519 support)</li>
                  <li>EVM-compatible transactions via JSON-RPC</li>
                  <li>Compatible with Ethereum wallets</li>
                  <li>Uses Hedera JSON-RPC Relay</li>
                  <li style={{ color: '#4caf50', fontWeight: 'bold' }}>
                    ✅ Supported by HashPack in WalletConnect v2
                  </li>
                </ul>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '15px',
                border: '2px solid',
                borderColor: selectedNamespace === 'both' ? '#7B3FF2' : '#ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedNamespace === 'both' ? '#f8f5ff' : 'white',
              }}
            >
              <input
                type="radio"
                name="namespace"
                value="both"
                checked={selectedNamespace === 'both'}
                onChange={() => setSelectedNamespace('both')}
                style={{ marginTop: '2px' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '16px', display: 'block', marginBottom: '5px' }}>
                  Both Namespaces (hedera: + eip155:)
                </strong>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Connect with both native and EVM compatibility
                </div>
                <ul style={{ fontSize: '13px', color: '#666', margin: 0, paddingLeft: '20px' }}>
                  <li>Maximum compatibility with all features</li>
                  <li>Supports both Ed25519 and ECDSA accounts</li>
                  <li>Can use native Hedera or EVM transactions</li>
                  <li style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                    ❌ HashPack ignores hedera namespace, only connects via eip155
                  </li>
                </ul>
              </div>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            style={{
              padding: '10px 20px',
              backgroundColor: '#7B3FF2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Connect with{' '}
            {selectedNamespace === 'hedera'
              ? 'Hedera'
              : selectedNamespace === 'eip155'
                ? 'EIP-155'
                : 'Both'}
          </button>
        </div>
      </div>
    </div>
  )
}
