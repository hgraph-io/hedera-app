import { useEffect, useRef, useState } from 'react'

interface NodeAttempt {
  nodeIndex: number
  status: 'pending' | 'success' | 'failed'
  duration?: number
  error?: {
    errorType: string
    errorMessage: string
    stackTrace?: string
  }
}

interface TransactionProgressModalProps {
  isOpen: boolean
  phase: 'signing' | 'executing' | 'complete' | 'failed'
  nodeIndex?: number
  totalNodes: number
  signingDuration?: number
  attempts: NodeAttempt[]
  transactionId?: string
  onClose: () => void
  onRetry?: () => void
}

export function TransactionProgressModal({
  isOpen,
  phase,
  nodeIndex,
  totalNodes,
  signingDuration,
  attempts,
  transactionId,
  onClose,
  onRetry,
}: TransactionProgressModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set())
  const [copySuccess, setCopySuccess] = useState(false)

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    if (!modal) return

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    document.addEventListener('keydown', handleEscapeKey)

    // Focus first element
    firstElement?.focus()

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, onClose])

  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedErrors(newExpanded)
  }

  const copyErrorDetails = async () => {
    const errorData = {
      phase,
      totalNodes,
      signingDuration,
      attempts: attempts.map((attempt) => ({
        nodeIndex: attempt.nodeIndex,
        status: attempt.status,
        duration: attempt.duration,
        error: attempt.error
          ? {
              errorType: attempt.error.errorType,
              errorMessage: attempt.error.errorMessage,
              stackTrace: attempt.error.stackTrace,
            }
          : undefined,
      })),
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy error details:', error)
    }
  }

  const getTimingColor = (duration?: number) => {
    if (!duration) return 'text-gray-600'
    if (duration < 500) return 'text-green-600'
    if (duration < 2000) return 'text-yellow-600'
    return 'text-red-600'
  }

  const allNodesFailed = attempts.length === totalNodes && attempts.every((a) => a.status === 'failed')
  const canRetry = allNodesFailed && onRetry

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
              Transaction Progress (HIP-1190)
            </h2>
            <p id="modal-description" className="text-sm text-gray-600 mt-1">
              Multi-node transaction signing with automatic failover
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Signing Phase */}
        {phase === 'signing' && (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-lg font-medium">
                Signing for {totalNodes} nodes...
                {signingDuration && <span className="text-sm text-gray-600 ml-2">({signingDuration.toFixed(0)}ms)</span>}
              </span>
            </div>
          </div>
        )}

        {/* Execution Phase */}
        {(phase === 'executing' || phase === 'complete' || phase === 'failed') && (
          <div className="mb-6">
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  Attempting node {(nodeIndex ?? 0) + 1}/{totalNodes}
                </span>
                <span>
                  {attempts.filter((a) => a.status !== 'pending').length}/{totalNodes} attempted
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={(nodeIndex ?? 0) + 1}
                aria-valuemin={0}
                aria-valuemax={totalNodes}
                className="w-full bg-gray-200 rounded-full h-2"
              >
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((nodeIndex ?? 0) + 1) / totalNodes * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Node Attempts List */}
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <div
                  key={attempt.nodeIndex}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-label={attempt.status}>
                        {attempt.status === 'pending' && '⏳'}
                        {attempt.status === 'success' && '✅'}
                        {attempt.status === 'failed' && '❌'}
                      </span>
                      <div>
                        <span className="font-medium">Node {attempt.nodeIndex + 1}</span>
                        <span className="ml-2 text-sm text-gray-600 capitalize">
                          {attempt.status}
                        </span>
                      </div>
                    </div>
                    {attempt.duration && (
                      <span className={`text-sm font-medium ${getTimingColor(attempt.duration)}`}>
                        {attempt.duration.toFixed(0)}ms
                      </span>
                    )}
                  </div>

                  {/* Error Details */}
                  {attempt.error && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleErrorExpansion(attempt.nodeIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <span>{expandedErrors.has(attempt.nodeIndex) ? '▼' : '▶'}</span>
                        <span>Error Details</span>
                      </button>
                      {expandedErrors.has(attempt.nodeIndex) && (
                        <div className="mt-2 p-3 bg-red-50 rounded text-sm">
                          <div className="mb-2">
                            <strong>Type:</strong> {attempt.error.errorType}
                          </div>
                          <div className="mb-2">
                            <strong>Message:</strong> {attempt.error.errorMessage}
                          </div>
                          {attempt.error.stackTrace && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                Stack Trace
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto text-xs">
                                {attempt.error.stackTrace}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Result */}
        {phase === 'complete' && transactionId && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <span className="text-2xl">✅</span>
              <span className="font-bold text-lg">Transaction Successful!</span>
            </div>
            <div className="text-sm text-green-700">
              <strong>Transaction ID:</strong> {transactionId}
            </div>
          </div>
        )}

        {/* Failed Result */}
        {phase === 'failed' && allNodesFailed && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <span className="text-2xl">❌</span>
              <span className="font-bold text-lg">All Nodes Failed</span>
            </div>
            <div className="text-sm text-red-700">
              The transaction could not be executed on any of the {totalNodes} nodes.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {attempts.length > 0 && (
            <button
              onClick={copyErrorDetails}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {copySuccess ? '✓ Copied!' : 'Copy Error Details'}
            </button>
          )}
          {canRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry with Different Nodes
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
