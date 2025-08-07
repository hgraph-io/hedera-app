import { useState, useEffect, useCallback } from 'react'
import { 
  DAppConnector, 
  HederaJsonRpcMethod,
  ExtensionData,
  DAppSigner
} from '@hashgraph/hedera-wallet-connect'
import { SessionTypes } from '@walletconnect/types'
import { LedgerId, AccountId } from '@hashgraph/sdk'
import { projectId, metadata } from '../config'

export interface DAppConnectorState {
  isConnected: boolean
  isInitializing: boolean
  connector: DAppConnector | null
  session: SessionTypes.Struct | null
  signers: DAppSigner[]
  accountId: string | null
  error: string | null
}

export function useDAppConnectorV1() {
  const [state, setState] = useState<DAppConnectorState>({
    isConnected: false,
    isInitializing: false,
    connector: null,
    session: null,
    signers: [],
    accountId: null,
    error: null,
  })

  // Initialize DAppConnector
  const initializeConnector = useCallback(async () => {
    if (state.connector || state.isInitializing) return state.connector

    setState(prev => ({ ...prev, isInitializing: true, error: null }))

    try {
      const dAppConnector = new DAppConnector(
        metadata,
        LedgerId.TESTNET,
        projectId,
        Object.values(HederaJsonRpcMethod),
        ['https://walletconnect.hashpack.app']
      )

      await dAppConnector.init({ logger: 'error' } as any)

      setState(prev => ({
        ...prev,
        connector: dAppConnector,
        isInitializing: false,
      }))

      return dAppConnector
    } catch (error) {
      console.error('Failed to initialize DAppConnector:', error)
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Failed to initialize connector',
      }))
      return null
    }
  }, [state.connector, state.isInitializing])

  // Update signers when session changes
  const updateSigners = useCallback((connector: DAppConnector, session: SessionTypes.Struct | null) => {
    if (!connector || !session) {
      return { signers: [], accountId: null }
    }

    try {
      // Get account from session
      const accountIdStr = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop() || 
                          session.namespaces?.eip155?.accounts?.[0]?.split(':').pop() || null
      
      if (!accountIdStr) {
        console.warn('No account found in session')
        return { signers: [], accountId: null }
      }

      // Try different methods to get the signer
      let signer: DAppSigner | null = null
      
      // Method 1: Try with AccountId object
      try {
        const accountId = AccountId.fromString(accountIdStr)
        signer = connector.getSigner(accountId)
      } catch (e) {
        console.log('Method 1 failed, trying method 2')
      }

      // Method 2: Try getting all signers
      if (!signer) {
        try {
          const allSigners = (connector as any).getSigners?.() || []
          signer = allSigners[0] || null
        } catch (e) {
          console.log('Method 2 failed, trying method 3')
        }
      }

      // Method 3: Try with session topic
      if (!signer && session.topic) {
        try {
          signer = (connector as any).getSigner(session.topic)
        } catch (e) {
          console.log('Method 3 failed')
        }
      }

      const signers = signer ? [signer] : []
      
      console.log('Signers updated:', { accountId: accountIdStr, signerAvailable: !!signer })
      
      return { signers, accountId: accountIdStr }
    } catch (error) {
      console.error('Error updating signers:', error)
      return { signers: [], accountId: null }
    }
  }, [])

  // Connect wallet
  const connect = useCallback(async (extensionData?: ExtensionData[]): Promise<boolean> => {
    const connector = state.connector || await initializeConnector()
    if (!connector) return false

    setState(prev => ({ ...prev, error: null }))

    try {
      let session: SessionTypes.Struct | null = null

      if (extensionData && extensionData.length > 0) {
        // Connect with extension
        session = await connector.connectExtension(extensionData[0].id)
      } else {
        // Open modal for QR code connection
        const uri = await connector.openModal()
        if (!uri) {
          throw new Error('Failed to get connection URI')
        }
        
        // Wait for connection to be established
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const walletClient = (connector as any).walletConnectClient
            const sessions = walletClient?.session?.getAll?.() || []
            if (sessions.length > 0) {
              clearInterval(checkInterval)
              session = sessions[0]
              resolve()
            }
          }, 500)
          
          // Timeout after 60 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            resolve()
          }, 60000)
        })
      }

      // Get the session if not already set
      if (!session) {
        const walletClient = (connector as any).walletConnectClient
        const sessions = walletClient?.session?.getAll?.() || []
        session = sessions[0] || null
      }

      if (session) {
        // Update signers after connection
        const { signers, accountId } = updateSigners(connector, session)

        setState(prev => ({
          ...prev,
          isConnected: true,
          session,
          signers,
          accountId,
          connector,
        }))

        return true
      }

      return false
    } catch (error) {
      console.error('Connection failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
      }))
      return false
    }
  }, [state.connector, initializeConnector, updateSigners])

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (!state.connector) return

    try {
      const topic = state.session?.topic || ''
      await state.connector.disconnect(topic)
      setState(prev => ({
        ...prev,
        isConnected: false,
        session: null,
        signers: [],
        accountId: null,
        error: null,
      }))
    } catch (error) {
      console.error('Disconnect failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Disconnect failed',
      }))
    }
  }, [state.connector, state.session])

  // Get available extensions
  const getAvailableExtensions = useCallback((): ExtensionData[] => {
    if (!state.connector) return []
    const extensions = (state.connector as any).extensions?.filter((ext: any) => ext.available) || []
    
    // Deduplicate extensions by ID
    const uniqueExtensions = extensions.reduce((acc: ExtensionData[], ext: ExtensionData) => {
      if (!acc.find((e: ExtensionData) => e.id === ext.id)) {
        acc.push(ext)
      }
      return acc
    }, [])
    
    // Sort extensions to put HashPack first
    return uniqueExtensions.sort((a: ExtensionData, b: ExtensionData) => {
      const aIsHashPack = a.name?.toLowerCase().includes('hashpack') || false
      const bIsHashPack = b.name?.toLowerCase().includes('hashpack') || false
      
      if (aIsHashPack && !bIsHashPack) return -1
      if (!aIsHashPack && bIsHashPack) return 1
      return 0
    })
  }, [state.connector])

  // Re-establish signers when session changes
  useEffect(() => {
    if (state.connector && state.session && state.signers.length === 0) {
      const { signers, accountId } = updateSigners(state.connector, state.session)
      if (signers.length > 0) {
        setState(prev => ({
          ...prev,
          signers,
          accountId,
        }))
      }
    }
  }, [state.connector, state.session, state.signers.length, updateSigners])

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const connector = await initializeConnector()
      if (!connector) return

      const walletClient = (connector as any)?.walletConnectClient
      const currentSession = walletClient?.session?.getAll?.()?.[0]
      
      if (currentSession) {
        const { signers, accountId } = updateSigners(connector, currentSession)

        setState(prev => ({
          ...prev,
          isConnected: true,
          connector,
          session: currentSession,
          signers,
          accountId,
        }))
      }
    }

    checkExistingSession()
  }, []) // Only run on mount

  return {
    ...state,
    connect,
    disconnect,
    getAvailableExtensions,
  }
}