import { useState, useEffect } from 'react'
import { DEFAULT_RPC_URL } from '../config'

interface ConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (projectId: string, rpcUrl: string) => void
  currentProjectId?: string
  currentRpcUrl?: string
}

export function ConfigurationModal({ isOpen, onClose, onSave, currentProjectId, currentRpcUrl }: ConfigurationModalProps) {
  const [projectId, setProjectId] = useState('')
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL)

  // Load current values when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedProjectId = currentProjectId || localStorage.getItem('reownProjectId') || ''
      const savedRpcUrl = currentRpcUrl || localStorage.getItem('hederaRpcUrl') || DEFAULT_RPC_URL

      setProjectId(savedProjectId)
      setRpcUrl(savedRpcUrl)
    }
  }, [isOpen, currentProjectId, currentRpcUrl])

  if (!isOpen) return null

  const handleSave = () => {
    if (!projectId) {
      alert('Please enter a Project ID')
      return
    }

    // Save to localStorage
    localStorage.setItem('reownProjectId', projectId)
    localStorage.setItem('hederaRpcUrl', rpcUrl)

    onSave(projectId, rpcUrl)
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
        <h2>Update Configuration</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px' }}>
            <strong>Reown Project ID *</strong>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Get from dashboard.reown.com"
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
              required
            />
          </label>

          <label style={{ display: 'block', marginBottom: '10px' }}>
            <strong>Hedera JSON-RPC URL</strong>
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="https://testnet.hedera.api.hgraph.io/v1/YOUR_API_KEY/rpc"
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </label>

          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            <p>
              • Get your Project ID from{' '}
              <a href="https://dashboard.reown.com" target="_blank" rel="noopener noreferrer">
                dashboard.reown.com
              </a>
            </p>
            <p>
              • Get your API key from{' '}
              <a href="https://dashboard.hgraph.com" target="_blank" rel="noopener noreferrer">
                dashboard.hgraph.com
              </a>
            </p>
            <p>• Format: https://testnet.hedera.api.hgraph.io/v1/YOUR_API_KEY/rpc</p>
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
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#7B3FF2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            disabled={!projectId}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
