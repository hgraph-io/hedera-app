import type UniversalProvider from '@walletconnect/universal-provider'

export class SessionMonitor {
  private provider: UniversalProvider
  private isValidating = false

  constructor(provider: UniversalProvider) {
    this.provider = provider
  }

  async validateSession(): Promise<boolean> {
    if (this.isValidating) return false

    try {
      this.isValidating = true

      // Check if session exists
      if (!this.provider.session) return false

      // Check if session is expired
      const session = this.provider.session
      if (session.expiry && new Date(session.expiry * 1000) < new Date()) {
        return false
      }

      // Check if we have valid namespaces
      const hasValidNamespaces = !!(session.namespaces?.hedera || session.namespaces?.eip155)

      return hasValidNamespaces
    } catch (error) {
      console.error('Session validation failed:', error)
      return false
    } finally {
      this.isValidating = false
    }
  }

  async cleanupInvalidSessions() {
    try {
      // Clear WalletConnect storage
      const wcKeys = Object.keys(localStorage).filter(
        (key) => key.startsWith('wc@') || key.startsWith('walletconnect') || key.includes('WC'),
      )
      wcKeys.forEach((key) => localStorage.removeItem(key))

      // Disconnect any existing sessions
      if (this.provider.session) {
        await this.provider.disconnect()
      }
    } catch (error) {
      console.error('Session cleanup failed:', error)
    }
  }
}
