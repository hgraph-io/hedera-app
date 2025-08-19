export class SessionMonitor {
  private intervalId: NodeJS.Timer | null = null
  private callback: () => void
  private intervalMs: number

  constructor(callback: () => void, intervalMs = 5000) {
    this.callback = callback
    this.intervalMs = intervalMs
  }

  start() {
    if (this.intervalId) {
      this.stop()
    }
    this.intervalId = setInterval(this.callback, this.intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  isRunning() {
    return this.intervalId !== null
  }
}

