import { useState, useEffect } from 'react'
import { ExtensionData } from '@hashgraph/hedera-wallet-connect'

interface V1ConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (extensionData?: ExtensionData[]) => Promise<boolean>
  availableExtensions: ExtensionData[]
  isDetectingExtensions?: boolean
  onRefreshExtensions?: () => void
}

export function V1ConnectionModal({
  isOpen,
  onClose,
  onConnect,
  availableExtensions,
  isDetectingExtensions = false,
  onRefreshExtensions,
}: V1ConnectionModalProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setIsConnecting(false)
    } else {
      // Refresh extension detection when modal opens
      onRefreshExtensions?.()
    }
  }, [isOpen, onRefreshExtensions])

  const handleQRConnection = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      const success = await onConnect()
      if (success) {
        onClose()
      } else {
        setError('Connection failed. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleExtensionConnection = async (extension: ExtensionData) => {
    setIsConnecting(true)
    setError(null)

    try {
      const success = await onConnect([extension])
      if (success) {
        onClose()
      } else {
        setError('Extension connection failed. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extension connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-content v1-connection-modal">
        <h2>Connect with HWC v1</h2>

        {error && (
          <div
            className="error-message"
            style={{
              color: 'red',
              padding: '10px',
              marginBottom: '10px',
              border: '1px solid red',
              borderRadius: '4px',
              backgroundColor: '#ffebee',
            }}
          >
            {error}
          </div>
        )}

        <div className="extensions-section" style={{ marginBottom: '20px' }}>
          <h3>Browser Extensions</h3>
          {isDetectingExtensions ? (
            <div
              className="extensions-loading"
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#666',
                fontStyle: 'italic',
              }}
            >
              Detecting browser extensions...
            </div>
          ) : availableExtensions.length > 0 ? (
            <div className="extensions-list">
              {availableExtensions.map((ext) => (
                <button
                  key={ext.id}
                  onClick={() => handleExtensionConnection(ext)}
                  disabled={isConnecting}
                  className="extension-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    margin: '5px 0',
                    width: '100%',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: isConnecting ? 'not-allowed' : 'pointer',
                    opacity: isConnecting ? 0.5 : 1,
                  }}
                >
                  {ext.icon && (
                    <img
                      src={ext.icon}
                      alt={ext.name}
                      style={{ width: '24px', height: '24px' }}
                    />
                  )}
                  <span>{ext.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="no-extensions"
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#666',
                fontSize: '14px',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
              }}
            >
              No browser extensions detected. Make sure you have a HWC v1 compatible wallet
              extension installed and enabled.
            </div>
          )}
        </div>

        <div
          className="divider"
          style={{
            margin: '20px 0',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <span
            style={{
              backgroundColor: 'white',
              padding: '0 10px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            OR
          </span>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: '#ddd',
              zIndex: 0,
            }}
          ></div>
        </div>

        <div className="qr-section" style={{ textAlign: 'center' }}>
          <h3>Connect with QR Code</h3>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Scan with a HWC v1 compatible wallet
          </p>
          <button
            onClick={handleQRConnection}
            disabled={isConnecting}
            className="connect-button"
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#7B3FF2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              opacity: isConnecting ? 0.5 : 1,
            }}
          >
            {isConnecting ? 'Connecting...' : 'Show QR Code'}
          </button>
        </div>

        <div
          className="info-section"
          style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
          }}
        >
          <p>This uses the legacy HWC v1 protocol with DAppConnector.</p>
        </div>
      </div>
    </div>
  )
}
