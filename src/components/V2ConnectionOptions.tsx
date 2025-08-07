import { useState } from 'react'

interface V2ConnectionOptionsProps {
  onConnect: (namespace: 'hedera' | 'eip155' | 'both') => void
}

export function V2ConnectionOptions({ onConnect }: V2ConnectionOptionsProps) {
  const [selectedNamespace, setSelectedNamespace] = useState<'hedera' | 'eip155' | 'both'>('hedera')

  return (
    <div className="v2-connection-options" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      padding: '15px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '20px',
    }}>
      <h3 style={{ margin: 0, fontSize: '16px' }}>HWC v2 Connection Options</h3>
      
      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
        }}>
          <input
            type="radio"
            name="namespace"
            value="hedera"
            checked={selectedNamespace === 'hedera'}
            onChange={() => setSelectedNamespace('hedera')}
          />
          <div>
            <strong>Hedera Namespace</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Native Hedera protocol - Supports all account types (Ed25519 & ECDSA)
            </div>
          </div>
        </label>
        
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
        }}>
          <input
            type="radio"
            name="namespace"
            value="eip155"
            checked={selectedNamespace === 'eip155'}
            onChange={() => setSelectedNamespace('eip155')}
          />
          <div>
            <strong>EIP-155 Namespace</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Ethereum compatibility - ECDSA accounts only
            </div>
          </div>
        </label>
        
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
        }}>
          <input
            type="radio"
            name="namespace"
            value="both"
            checked={selectedNamespace === 'both'}
            onChange={() => setSelectedNamespace('both')}
          />
          <div>
            <strong>Both Namespaces</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Maximum compatibility - Supports all features
            </div>
          </div>
        </label>
      </div>
      
      <button
        onClick={() => onConnect(selectedNamespace)}
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
        Connect with HWC v2 ({selectedNamespace === 'both' ? 'hedera + eip155' : selectedNamespace})
      </button>
    </div>
  )
}