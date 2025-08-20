import { useState } from 'react'

interface Method {
  name: string
  action: () => void | Promise<void>
}

interface ActionButtonListProps {
  title: string
  methods?: Method[]
  ethMethods?: Method[]
  onClearState?: () => void
  onDisconnect?: () => void
  jsonRpcProvider?: any
}

export const ActionButtonList = ({
  title,
  methods = [],
  ethMethods = [],
  onClearState,
  onDisconnect,
}: ActionButtonListProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleMethodClick = async (method: Method) => {
    setIsLoading(true)
    try {
      await method.action()
    } catch (error) {
      console.error(`Error executing ${method.name}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const allMethods = [...methods, ...ethMethods]

  return (
    <div className="action-buttons">
      <h3>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {allMethods.map((method, index) => (
          <button
            key={index}
            onClick={() => handleMethodClick(method)}
            disabled={isLoading}
            className="primary-button"
            style={{
              minWidth: '150px',
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {method.name}
          </button>
        ))}

        {onClearState && (
          <button
            onClick={onClearState}
            disabled={isLoading}
            className="secondary-button"
            style={{ minWidth: '150px' }}
          >
            Clear State
          </button>
        )}

        {onDisconnect && (
          <button
            onClick={onDisconnect}
            disabled={isLoading}
            className="secondary-button"
            style={{
              minWidth: '150px',
              backgroundColor: '#dc3545',
            }}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}
