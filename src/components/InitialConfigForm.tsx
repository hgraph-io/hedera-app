import { useState, useEffect } from 'react'
import { DEFAULT_RPC_URL } from '../config'

interface InitialConfigFormProps {
  onSubmit: (projectId: string, rpcUrl: string) => void
}

export function InitialConfigForm({ onSubmit }: InitialConfigFormProps) {
  const [projectId, setProjectId] = useState('')
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL)

  // Check for saved values on mount
  useEffect(() => {
    const savedProjectId = localStorage.getItem('reownProjectId')
    const savedRpcUrl = localStorage.getItem('hederaRpcUrl')

    if (savedProjectId) setProjectId(savedProjectId)
    if (savedRpcUrl) setRpcUrl(savedRpcUrl)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId) {
      alert('Please enter a Project ID')
      return
    }

    // Save to localStorage
    localStorage.setItem('reownProjectId', projectId)
    localStorage.setItem('hederaRpcUrl', rpcUrl)

    onSubmit(projectId, rpcUrl)
  }

  return (
    <div className="walletconnect" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>Hedera DApp Example</h1>
        <p style={{ color: '#666' }}>Configure your connection settings to get started</p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Reown Project ID *
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Enter your Project ID from dashboard.reown.com"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            required
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Get your Project ID from{' '}
            <a href="https://dashboard.reown.com" target="_blank" rel="noopener noreferrer">
              dashboard.reown.com
            </a>
          </p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Hedera JSON-RPC URL
          </label>
          <input
            type="text"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            placeholder="https://testnet.hedera.api.hgraph.io/v1/YOUR_API_KEY/rpc"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Get your API key from{' '}
            <a
              href="https://dashboard.hgraph.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#7B3FF2', textDecoration: 'underline' }}
            >
              dashboard.hgraph.com
            </a>{' '}
            and replace YOUR_API_KEY in the URL above. Leave blank to use the default endpoint.
          </p>
        </div>

        <button
          type="submit"
          style={{
            padding: '12px 24px',
            backgroundColor: '#7B3FF2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            marginTop: '10px',
          }}
        >
          Continue
        </button>
      </form>

      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px' }}>Quick Start:</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
          <li>Get a free Project ID from dashboard.reown.com</li>
          <li>Get your API key from dashboard.hgraph.com (free tier available)</li>
          <li>Enter your Project ID above</li>
          <li>Enter your hgraph RPC URL with your API key (or use default)</li>
          <li>Click Continue to start using the DApp</li>
        </ol>
      </div>
    </div>
  )
}
