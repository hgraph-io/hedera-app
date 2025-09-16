import { useEffect } from 'react'
import { Transaction } from '@hashgraph/sdk'

interface SignedTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  signedTransaction: Transaction | null
  transactionDetails?: {
    from?: string
    to?: string
    amount?: string
    maxFee?: string
  }
}

export function SignedTransactionModal({
  isOpen,
  onClose,
  signedTransaction,
  transactionDetails,
}: SignedTransactionModalProps) {
  if (!signedTransaction) return null

  // Get transaction information
  const getTransactionInfo = () => {
    try {
      // Try to get transaction as string
      let txString = 'Transaction data available'
      try {
        txString = JSON.stringify(signedTransaction, null, 2)
      } catch {
        try {
          txString = signedTransaction.toString()
        } catch {
          txString = 'Transaction data (unable to convert to string)'
        }
      }

      // Try to get transaction bytes
      let bytesLength = 0
      try {
        const txBytes = signedTransaction.toBytes()
        bytesLength = txBytes.length
      } catch {
        // If toBytes fails, estimate size
        bytesLength = txString.length
      }

      // Try to get transaction hash
      let hash = 'N/A'
      try {
        const txHash = signedTransaction.getTransactionHash()
        if (txHash) {
          // txHash might already be a Uint8Array or Buffer
          if (txHash instanceof Uint8Array) {
            hash = Buffer.from(txHash).toString('hex')
          } else if (typeof txHash === 'string') {
            hash = txHash
          } else {
            hash = 'Hash available but unable to display'
          }
        }
      } catch {
        // Hash not available
      }

      return {
        string: txString,
        bytesLength,
        hash,
      }
    } catch (error) {
      console.error('Error getting transaction info:', error)
      return {
        string: 'Unable to display transaction',
        bytesLength: 0,
        hash: 'N/A',
      }
    }
  }

  const txInfo = getTransactionInfo()

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ padding: '20px' }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Signed Transaction Details</h2>

          <div
            style={{
              backgroundColor: '#f0f8ff',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <p style={{ margin: '0 0 10px 0', color: '#28a745', fontWeight: 'bold' }}>
              ✓ Transaction Signed Successfully
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
              This transaction is ready to be executed. Use "hedera_executeTransaction" to
              submit it to the network.
            </p>
          </div>

          {transactionDetails && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Transaction Summary</h3>
              <div
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '15px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                }}
              >
                {transactionDetails.from && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>From:</strong> {transactionDetails.from}
                  </div>
                )}
                {transactionDetails.to && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>To:</strong> {transactionDetails.to}
                  </div>
                )}
                {transactionDetails.amount && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Amount:</strong> {transactionDetails.amount}
                  </div>
                )}
                {transactionDetails.maxFee && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Max Fee:</strong> {transactionDetails.maxFee}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Technical Details</h3>
            <div
              style={{
                backgroundColor: '#f5f5f5',
                padding: '15px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <strong>Transaction Hash:</strong>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    marginTop: '4px',
                    color: '#666',
                  }}
                >
                  {txInfo.hash}
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Size:</strong> {txInfo.bytesLength} bytes
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Raw Transaction</h3>
            <div
              style={{
                backgroundColor: '#f5f5f5',
                padding: '15px',
                borderRadius: '4px',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {txInfo.string}
              </pre>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Close
            </button>
            <button
              onClick={() => {
                // Copy transaction to clipboard
                navigator.clipboard.writeText(txInfo.string)
                alert('Transaction copied to clipboard!')
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Copy Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
