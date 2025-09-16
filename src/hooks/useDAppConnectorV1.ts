import { useState, useEffect, useCallback } from 'react'
import {
  DAppConnector,
  HederaJsonRpcMethod,
  ExtensionData,
  DAppSigner,
} from '@hashgraph/hedera-wallet-connect'
import { SessionTypes } from '@walletconnect/types'
import { LedgerId, AccountId } from '@hashgraph/sdk'
import { metadata } from '../config'

export interface DAppConnectorState {
  isConnected: boolean
  isInitializing: boolean
  connector: DAppConnector | null
  session: SessionTypes.Struct | null
  signers: DAppSigner[]
  accountId: string | null
  error: string | null
  isDetectingExtensions: boolean
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
    isDetectingExtensions: true,
  })

  // Update signers when session changes
  const updateSigners = useCallback(
    (connector: DAppConnector, session: SessionTypes.Struct | null) => {
      if (!connector || !session) {
        return { signers: [], accountId: null }
      }

      try {
        // Get account from session
        const accountIdStr =
          session.namespaces?.hedera?.accounts?.[0]?.split(':').pop() ||
          session.namespaces?.eip155?.accounts?.[0]?.split(':').pop() ||
          null

        if (!accountIdStr) {
          console.warn('No account found in session')
          return { signers: [], accountId: null }
        }

        // Try different methods to get the signer
        let signer: DAppSigner | null = null

        // Method 1: Try with AccountId object
        try {
          const accountId = AccountId.fromString(accountIdStr)
          signer = connector.getSigner(accountId as unknown as AccountId)
        } catch {
          console.log('Method 1 failed, trying method 2')
        }

        // Method 2: Try getting all signers
        if (!signer) {
          try {
            const allSigners =
              (connector as unknown as { getSigners?: () => DAppSigner[] }).getSigners?.() || []
            signer = allSigners[0] || null
          } catch {
            console.log('Method 2 failed, trying method 3')
          }
        }

        // Method 3: Try with session topic
        if (!signer && session.topic) {
          try {
            signer =
              (
                connector as unknown as { getSigner?: (topic: string) => DAppSigner }
              ).getSigner?.(session.topic) || null
          } catch {
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
    },
    [],
  )

  // Initialize DAppConnector
  const initializeConnector = useCallback(
    async (checkExistingSession = true) => {
      if (state.connector || state.isInitializing) return state.connector

      setState((prev) => ({ ...prev, isInitializing: true, error: null }))

      try {
        console.log('Initializing V1 DAppConnector...')

        // Get projectId from localStorage (it should exist if user has configured the app)
        const projectId = localStorage.getItem('reownProjectId')
        if (!projectId) {
          throw new Error('Project ID not configured. Please configure the app first.')
        }

        const dAppConnector = new DAppConnector(
          metadata,
          LedgerId.TESTNET,
          projectId,
          Object.values(HederaJsonRpcMethod),
          ['https://walletconnect.hashpack.app'],
        )

        await dAppConnector.init({ logger: 'error' } as Parameters<
          typeof dAppConnector.init
        >[0])

        setState((prev) => ({
          ...prev,
          connector: dAppConnector,
          isInitializing: false,
        }))

        // Check for existing V1 session after initialization
        if (checkExistingSession) {
          const walletClient = (
            dAppConnector as unknown as {
              walletConnectClient?: { session?: { getAll?: () => unknown[] } }
            }
          )?.walletConnectClient
          const existingSessions = walletClient?.session?.getAll?.() || []

          // Look for V1 sessions (with hedera namespace)
          const v1Session = existingSessions.find(
            (s: unknown) => (s as { namespaces?: { hedera?: unknown } }).namespaces?.hedera,
          )

          if (v1Session) {
            console.log('Restored existing V1 session')
            const { signers, accountId } = updateSigners(
              dAppConnector,
              v1Session as SessionTypes.Struct,
            )

            setState((prev) => ({
              ...prev,
              isConnected: true,
              session: v1Session as SessionTypes.Struct,
              signers,
              accountId,
            }))

            // Update session marker
            sessionStorage.setItem(
              'hwcV1Session',
              JSON.stringify({
                topic: (v1Session as SessionTypes.Struct).topic,
                accountId,
                timestamp: Date.now(),
              }),
            )
          }
        }

        // Wait for extension detection to complete
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            isDetectingExtensions: false,
          }))
        }, 1000)

        return dAppConnector
      } catch (error) {
        console.error('Failed to initialize DAppConnector:', error)
        setState((prev) => ({
          ...prev,
          isInitializing: false,
          isDetectingExtensions: false,
          error: error instanceof Error ? error.message : 'Failed to initialize connector',
        }))
        return null
      }
    },
    [state.connector, state.isInitializing, updateSigners],
  )

  // Connect wallet
  const connect = useCallback(
    async (extensionData?: ExtensionData[]): Promise<boolean> => {
      const connector = state.connector || (await initializeConnector())
      if (!connector) return false

      setState((prev) => ({ ...prev, error: null }))

      try {
        let session: SessionTypes.Struct | null = null

        if (extensionData && extensionData.length > 0) {
          // Connect with extension
          console.log('🔗 V1 Connection: Connecting via extension', {
            extensionId: extensionData[0].id,
            extensionName: extensionData[0].name,
          })

          try {
            session = await connector.connectExtension(extensionData[0].id)
          } catch (error) {
            if (
              error instanceof Error &&
              (error.message.includes('Expired') || error.message.includes('expired'))
            ) {
              throw new Error('Connection request expired. Please try again.')
            }
            throw error
          }
        } else {
          // Open modal for QR code connection
          console.log('🔗 V1 Connection: Opening modal for QR code connection')

          try {
            // openModal returns a session, not a URI
            session = await connector.openModal()
            if (!session) {
              throw new Error('Failed to establish connection')
            }
            console.log('🔗 V1 Connection: Session established', {
              topic: session.topic,
              peer: session.peer,
            })
          } catch (error) {
            if (
              error instanceof Error &&
              (error.message.includes('Expired') || error.message.includes('expired'))
            ) {
              throw new Error('Connection request expired. Please try again.')
            }
            throw error
          }
        }

        // Get the session if not already set
        if (!session) {
          const walletClient = (
            connector as unknown as {
              walletConnectClient?: { session?: { getAll?: () => unknown[] } }
            }
          ).walletConnectClient
          const sessions = walletClient?.session?.getAll?.() || []
          session = (sessions[0] as SessionTypes.Struct) || null
        }

        if (session) {
          // Log V1 connection payload
          console.log('✅ V1 Connection Established:', {
            topic: session.topic,
            peer: session.peer,
            namespaces: session.namespaces,
            requiredNamespaces: session.requiredNamespaces,
            optionalNamespaces: session.optionalNamespaces,
            sessionProperties: session.sessionProperties,
            expiry: session.expiry,
            acknowledged: session.acknowledged,
            controller: session.controller,
            self: session.self,
          })

          // Log the actual namespace structure
          console.log('📦 V1 Namespaces Detail:', {
            hasHedera: !!session.namespaces?.hedera,
            hasEip155: !!session.namespaces?.eip155,
            hederaAccounts: session.namespaces?.hedera?.accounts,
            hederaMethods: session.namespaces?.hedera?.methods,
            hederaEvents: session.namespaces?.hedera?.events,
            eip155Accounts: session.namespaces?.eip155?.accounts,
            eip155Methods: session.namespaces?.eip155?.methods,
            eip155Events: session.namespaces?.eip155?.events,
          })

          // Update signers after connection
          const { signers, accountId } = updateSigners(connector, session)

          setState((prev) => ({
            ...prev,
            isConnected: true,
            session,
            signers,
            accountId,
            connector,
          }))

          // Save V1 session marker to storage
          sessionStorage.setItem(
            'hwcV1Session',
            JSON.stringify({
              topic: session.topic,
              accountId,
              timestamp: Date.now(),
            }),
          )

          return true
        }

        return false
      } catch (error) {
        console.error('Connection failed:', error)
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Connection failed',
        }))
        return false
      }
    },
    [state.connector, initializeConnector, updateSigners],
  )

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (!state.connector) return

    try {
      const topic = state.session?.topic || ''
      await state.connector.disconnect(topic)

      // Clear V1 session from storage
      sessionStorage.removeItem('hwcV1Session')

      setState((prev) => ({
        ...prev,
        isConnected: false,
        session: null,
        signers: [],
        accountId: null,
        error: null,
      }))
    } catch (error) {
      console.error('Disconnect failed:', error)
      // Clear session even on error
      sessionStorage.removeItem('hwcV1Session')
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Disconnect failed',
      }))
    }
  }, [state.connector, state.session])

  // Get available extensions
  const getAvailableExtensions = useCallback((): ExtensionData[] => {
    if (!state.connector) return []
    const extensions =
      (state.connector as unknown as { extensions?: ExtensionData[] }).extensions?.filter(
        (ext: ExtensionData) => ext.available,
      ) || []

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

  // Refresh extension detection
  const refreshExtensionDetection = useCallback(() => {
    if (!state.connector) return

    setState((prev) => ({ ...prev, isDetectingExtensions: true }))

    // Trigger a new extension query
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'hedera-extension-query' }, '*')
    }

    // Wait for extensions to respond
    setTimeout(() => {
      setState((prev) => ({ ...prev, isDetectingExtensions: false }))
    }, 800)
  }, [state.connector])

  // Re-establish signers when session changes
  useEffect(() => {
    if (state.connector && state.session && state.signers.length === 0) {
      const { signers, accountId } = updateSigners(state.connector, state.session)
      if (signers.length > 0) {
        setState((prev) => ({
          ...prev,
          signers,
          accountId,
        }))
      }
    }
  }, [state.connector, state.session, state.signers.length, updateSigners])

  // Don't auto-initialize on mount - wait for user action
  // This prevents double initialization with V2
  useEffect(() => {
    const checkExistingSession = async () => {
      // Only check for existing V1 sessions if there's no V2 session
      const v2Namespace = sessionStorage.getItem('selectedHWCv2Namespace')
      if (v2Namespace) {
        console.log('V1 connector skipping - V2 namespace detected')
        return
      }

      // Check if there's an existing V1 session stored
      const existingV1Session = sessionStorage.getItem('hwcV1Session')
      if (existingV1Session) {
        try {
          JSON.parse(existingV1Session)
          console.log(
            'Found existing V1 session data, will restore on first connection attempt',
          )
          // Don't initialize here - wait for user action
        } catch {
          console.error('Invalid V1 session data in storage')
          sessionStorage.removeItem('hwcV1Session')
        }
      }
    }

    checkExistingSession()
  }, []) // Only run on mount

  return {
    ...state,
    connect,
    disconnect,
    getAvailableExtensions,
    refreshExtensionDetection,
    initializeConnector,
  }
}
