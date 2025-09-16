import { ReactNode } from 'react'

interface ConnectionWrapperProps {
  children: ReactNode
  onConnectionError?: (error: Error) => void
  universalProvider?: unknown
}

export function ConnectionWrapper({ children }: ConnectionWrapperProps) {
  // Simply pass through children without complex validation
  // The connection state is already managed by AppKit and the App component
  return <>{children}</>
}
