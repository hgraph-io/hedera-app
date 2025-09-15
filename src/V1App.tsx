import './App.css'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { V1ConnectionModal } from './components/V1ConnectionModal'
import { ConfigurationModal } from './components/ConfigurationModal'
import { MethodExecutor } from './components/MethodExecutor'
import { useDAppConnectorV1 } from './hooks/useDAppConnectorV1'
import { useV1Methods } from './hooks/useV1Methods'
import { DEFAULT_RPC_URL } from './config'

export interface FunctionResult {
  functionName: string
  result: string
}

export function V1App() {
  const [transactionHash, setTransactionHash] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [signedMsg, setSignedMsg] = useState('')
  const [nodes, setNodes] = useState<string[]>([])
  const [lastFunctionResult, setLastFunctionResult] = useState<FunctionResult | null>(null)
  const [showV1Modal, setShowV1Modal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)

  // V1 connection state
  const v1Connection = useDAppConnectorV1()
  const v1Methods = useV1Methods(v1Connection.signers, setTransactionId, setSignedMsg, setNodes)

  // Get configuration from localStorage
  const projectId = localStorage.getItem('reownProjectId')
  const rpcUrl = localStorage.getItem('hederaRpcUrl') || DEFAULT_RPC_URL

  const clearState = () => {
    setTransactionHash('')
    setTransactionId('')
    setSignedMsg('')
    setNodes([])
    setLastFunctionResult(null)
  }

  // Check for existing V1 session on mount
  useEffect(() => {
    const checkV1Session = async () => {
      const v1SessionMarker = sessionStorage.getItem('hwcV1Session')
      if (v1SessionMarker && !v1Connection.connector) {
        console.log('Found V1 session marker, initializing V1 connector to restore session')
        await v1Connection.initializeConnector()
      }
    }
    checkV1Session()
  }, []) // Only on mount

  // Setup V1 method executor
  const { executeV1Method } = v1Methods

  // Enhanced disconnect handler
  const handleDisconnect = async () => {
    try {
      await v1Connection.disconnect()

      // Clear any WalletConnect session data to prevent confusion
      const wcKeys = Object.keys(localStorage).filter(
        (key) =>
          key.startsWith('wc@') ||
          key.startsWith('walletconnect') ||
          key.startsWith('WC_') ||
          key.includes('walletConnect'),
      )
      wcKeys.forEach((key) => {
        localStorage.removeItem(key)
      })

      clearState()
    } catch (error) {
      console.error('Disconnect error:', error)
      // Always clear state even on error
      clearState()
    }
  }

  return (
    <ConnectionWrapper
      onConnectionError={(error) => {
        console.error('Connection error detected:', error)
        clearState()
      }}
      universalProvider={null}
    >
      <div className="pages">
        <div className="logos">
          <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
          <img src="/hedera.svg" alt="Hedera" style={{ width: '90px', height: '90px' }} />
        </div>
        <h1>Hedera App - V1 Connection</h1>

        {/* Navigation */}
        <div style={{ marginBottom: '20px' }}>
          <Link to="/">Switch to V2 Connection</Link>
        </div>

        {/* Connection Status */}
        <div
          style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#333' }}>
            Connection Information
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: v1Connection.isConnected ? '#00c851' : '#ff4444',
                }}
              />
              <span style={{ fontSize: '14px' }}>
                <strong>Status:</strong>{' '}
                {v1Connection.isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {v1Connection.isConnected && (
              <>
                <div style={{ fontSize: '14px' }}>
                  <strong>Protocol:</strong> HWC v1 (Legacy)
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong>Account ID:</strong>{' '}
                  <code
                    style={{
                      backgroundColor: '#e0e0e0',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {v1Connection.accountId || 'N/A'}
                  </code>
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong>Network:</strong>{' '}
                  {v1Connection.session?.namespaces?.hedera?.chains?.[0] === 'hedera:mainnet' ||
                  v1Connection.session?.namespaces?.eip155?.chains?.[0] === 'eip155:295'
                    ? 'Mainnet'
                    : 'Testnet'}
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong>Active Namespaces:</strong>{' '}
                  {[
                    v1Connection.session?.namespaces?.hedera && 'Hedera',
                    v1Connection.session?.namespaces?.eip155 && 'EIP155',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Hedera'}
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong>CAIP Address:</strong>{' '}
                  <code
                    style={{
                      backgroundColor: '#e0e0e0',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    {v1Connection.session?.namespaces?.hedera?.accounts?.[0] ||
                      v1Connection.session?.namespaces?.eip155?.accounts?.[0] ||
                      (v1Connection.accountId
                        ? `hedera:${
                            v1Connection.session?.namespaces?.hedera?.chains?.[0]?.split(
                              ':',
                            )[1] || 'testnet'
                          }:${v1Connection.accountId}`
                        : 'N/A')}
                  </code>
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong>Session Topic:</strong>{' '}
                  <code
                    style={{
                      backgroundColor: '#e0e0e0',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  >
                    {v1Connection.session?.topic
                      ? `${v1Connection.session.topic.substring(0, 8)}...${v1Connection.session.topic.substring(v1Connection.session.topic.length - 6)}`
                      : 'N/A'}
                  </code>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Connection Buttons */}
        {!v1Connection.isConnected ? (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={async () => {
                // Initialize V1 connector to detect extensions before showing modal
                await v1Connection.initializeConnector()
                setShowV1Modal(true)
              }}
              className="primary-button"
              style={{ backgroundColor: '#7B3FF2' }}
            >
              Connect with HWC v1
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <button
              onClick={handleDisconnect}
              className="primary-button"
              style={{ backgroundColor: '#dc3545' }}
            >
              Disconnect V1
            </button>
          </div>
        )}

        {/* Method Executor */}
        {v1Connection.isConnected && (
          <div style={{ marginBottom: '20px' }}>
            <MethodExecutor
              namespace="hedera"
              isConnected={v1Connection.isConnected}
              onExecute={executeV1Method}
              address={v1Connection.accountId || ''}
            />
          </div>
        )}

        <div className="advice">
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p>Current configuration:</p>
            <p>• Project ID: {projectId?.substring(0, 8)}...</p>
            <p>• RPC URL: {rpcUrl}</p>
            <button
              onClick={() => setShowConfigModal(true)}
              style={{
                marginTop: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Update Configuration
            </button>
          </div>
        </div>

        {/* Results Display */}
        {v1Connection.isConnected &&
          (transactionHash || transactionId || signedMsg || nodes.length > 0) && (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#f0f8ff',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <h3>Recent Results</h3>
              {transactionHash && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>ETH Transaction Hash:</strong>
                  <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                    {transactionHash}
                  </pre>
                </div>
              )}
              {transactionId && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Hedera Transaction ID:</strong>
                  <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                    {transactionId}
                  </pre>
                </div>
              )}
              {signedMsg && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Signed Message:</strong>
                  <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>{signedMsg}</pre>
                </div>
              )}
              {nodes.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Node Addresses:</strong>
                  <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                    {nodes.join(', ')}
                  </pre>
                </div>
              )}
              <button
                onClick={() => {
                  setTransactionHash('')
                  setTransactionId('')
                  setSignedMsg('')
                  setNodes([])
                  setLastFunctionResult(null)
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Clear Results
              </button>
            </div>
          )}

        {/* V1 Connection Modal */}
        <V1ConnectionModal
          isOpen={showV1Modal}
          onClose={() => setShowV1Modal(false)}
          onConnect={async (extensionData) => {
            const success = await v1Connection.connect(extensionData)
            if (success) {
              setShowV1Modal(false)
            }
            return success
          }}
          availableExtensions={v1Connection.getAvailableExtensions() || []}
          isDetectingExtensions={v1Connection.isDetectingExtensions}
          onRefreshExtensions={v1Connection.refreshExtensionDetection}
        />

        {/* Configuration Modal */}
        <ConfigurationModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSave={(newProjectId, newRpcUrl) => {
            // Save new configuration and reload to apply changes
            localStorage.setItem('reownProjectId', newProjectId)
            localStorage.setItem('hederaRpcUrl', newRpcUrl)
            window.location.reload()
          }}
          currentProjectId={projectId || ''}
          currentRpcUrl={rpcUrl}
        />
      </div>
    </ConnectionWrapper>
  )
}

export default V1App
