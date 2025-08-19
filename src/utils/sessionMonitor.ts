export class SessionMonitor {
  private universalProvider: any

  constructor(universalProvider: any) {
    this.universalProvider = universalProvider
  }

  async validateSession(): Promise<boolean> {
    try {
      if (!this.universalProvider?.session) return false
      
      // Check if the session is still valid
      const session = this.universalProvider.session
      if (!session.topic || !session.namespaces) return false
      
      // Check if session hasn't expired
      if (session.expiry && Date.now() / 1000 > session.expiry) {
        console.warn('Session expired')
        return false
      }
      
      return true
    } catch (error) {
      console.error('Session validation error:', error)
      return false
    }
  }

  async cleanupInvalidSessions(): Promise<void> {
    try {
      const isValid = await this.validateSession()
      if (!isValid && this.universalProvider?.session) {
        console.log('Cleaning up invalid session')
        await this.universalProvider.disconnect?.()
      }
    } catch (error) {
      console.error('Session cleanup error:', error)
    }
  }
}

