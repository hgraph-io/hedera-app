import './App.css'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'
import { ConnectionWrapper } from './components/ConnectionWrapper'
import { V1ConnectionModal } from './components/V1ConnectionModal'
import { ConfigurationModal } from './components/ConfigurationModal'
import { SessionMonitor } from './utils/sessionMonitor'
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
  const sessionMonitorRef = useRef<SessionMonitor | null>(null)

  // V1 connection state
  const v1Connection = useDAppConnectorV1()
  const v1Methods = useV1Methods(v1Connection.signers)

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

  // V1 method handlers
  const handleV1Transfer = async () => {
    try {
      const result = await v1Methods.executeMethod('transferHbar', {
        to: '0.0.123456',
        amount: 1,
      })
      if (result) {
        setTransactionId(result.transactionId)
        setLastFunctionResult({
          functionName: 'V1 Transfer HBAR',
          result: `Status: ${result.status}`,
        })
      }
    } catch (error) {
      console.error('V1 Transfer failed:', error)
      setLastFunctionResult({
        functionName: 'V1 Transfer HBAR',
        result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      })
    }
  }

  const handleV1SignMessage = async () => {
    try {
      const message = 'Hello from V1 - ' + new Date().toISOString()
      const result = await v1Methods.executeMethod('signMessage', { message })
      if (result) {
        setSignedMsg(result.signature)
        setLastFunctionResult({
          functionName: 'V1 Sign Message',
          result: 'Message signed successfully',
        })
      }
    } catch (error) {
      console.error('V1 Sign failed:', error)
      setLastFunctionResult({
        functionName: 'V1 Sign Message',
        result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      })
    }
  }

  const handleV1Balance = async () => {
    try {
      const result = await v1Methods.executeMethod('getAccountBalance')
      if (result) {
        setLastFunctionResult({
          functionName: 'V1 Account Balance',
          result: `${result.balance}`,
        })
      }
    } catch (error) {
      console.error('V1 Balance query failed:', error)
      setLastFunctionResult({
        functionName: 'V1 Account Balance',
        result: `Error: ${error instanceof Error ? error.message : 'Failed'}`,
      })
    }
  }

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
          <Link
            to="/"
            style={{
              padding: '10px 20px',
              backgroundColor: '#666',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block',
            }}
          >
            Switch to V2 Connection
          </Link>
        </div>

        {/* Connection Status */}
        <div
          style={{
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: '5px 0' }}>
            <strong>Connection Status:</strong>{' '}
            {v1Connection.isConnected ? 'Connected (V1)' : 'Not Connected'}
          </p>
          {v1Connection.isConnected && (
            <p style={{ margin: '5px 0' }}>
              <strong>V1 Account:</strong> {v1Connection.accountId || 'N/A'}
            </p>
          )}
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

        {/* Action Buttons */}
        {v1Connection.isConnected && (
          <ActionButtonList
            title="V1 Connection Methods"
            methods={[
              { name: 'Get Balance', action: handleV1Balance },
              { name: 'Transfer HBAR', action: handleV1Transfer },
              { name: 'Sign Message', action: handleV1SignMessage },
            ]}
            onClearState={clearState}
            jsonRpcProvider={null}
          />
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

        <InfoList
          hash={transactionHash}
          txId={transactionId}
          signedMsg={signedMsg}
          nodes={nodes}
          lastFunctionResult={lastFunctionResult}
          connectionMode="v1"
        />

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
