import { describe, it, vi } from 'vitest'

vi.mock('ethers', () => {
  class BrowserProvider {
    constructor(_: any, __: any) {}
    async getBalance() {
      return 1n
    }
    async send() {
      return 'rawHash'
    }
  }
  class JsonRpcSigner {
    constructor(_: any, __: any) {}
    async sendTransaction() {
      return { hash: 'txHash' }
    }
    async signTransaction() {
      return 'signedTx'
    }
    async signMessage() {
      return 'signature'
    }
    async signTypedData() {
      return 'typedSignature'
    }
  }
  class JsonRpcProvider {
    constructor(_: any) {}
    async request({ method }: any) {
      return method + '_result'
    }
  }
  return {
    BrowserProvider,
    JsonRpcProvider,
    JsonRpcSigner,
    parseEther: () => 1n,
    formatEther: (v: any) => String(v),
    getBigInt: (v: any) => BigInt(v),
    hexlify: (v: any) => '0x' + String(v),
  }
})

describe('useEthereumMethods RPC Error Tests', () => {
  it('should be defined', () => {
    // Basic test to ensure the test file loads
  })
})
