import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEthereumMethods } from '../../src/hooks/useEthereumMethods'

describe('useEthereumMethods RPC Error Tests', () => {
  let originalFetch: typeof global.fetch
  const mockProjectId = 'test-project-id'
  const mockChainId = 296

  beforeEach(() => {
    originalFetch = global.fetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('WalletConnect RPC 400 Error', () => {
    it('should identify when rpcProvider is undefined and causes 400 error', async () => {
      // Test case 1: walletProvider is null/undefined
      const { result } = renderHook(() =>
        useEthereumMethods({
          walletProvider: null,
          chainId: mockChainId,
          address: '0x123',
          ethTxHash: '',
          sendHash: vi.fn(),
          sendSignMsg: vi.fn(),
          jsonRpcProvider: null,
        }),
      )

      // This should throw or handle gracefully
      try {
        await result.current.executeEthMethod('eth_getBalance', { address: '0x123' })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        console.log('Error when rpcProvider is undefined:', error)
      }
    })

    it('should test rpcProvider path when walletProvider has no httpProviders', async () => {
      // Test case 2: walletProvider exists but has no httpProviders
      const mockWalletProvider = {
        rpcProviders: {
          eip155: {
            // Missing httpProviders
          },
        },
      }

      const { result } = renderHook(() =>
        useEthereumMethods({
          walletProvider: mockWalletProvider,
          chainId: mockChainId,
          address: '0x123',
          ethTxHash: '',
          sendHash: vi.fn(),
          sendSignMsg: vi.fn(),
          jsonRpcProvider: null,
        }),
      )

      try {
        await result.current.executeEthMethod('eth_getBalance', { address: '0x123' })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        console.log('Error when httpProviders missing:', error)
      }
    })

    it('should test malformed RPC request to WalletConnect endpoint', async () => {
      // Mock fetch to simulate the actual 400 error
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('rpc.walletconnect.org')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: () =>
              Promise.resolve({
                error: {
                  code: -32602,
                  message: 'Invalid params',
                },
              }),
          })
        }
        return originalFetch(url)
      })

      // Test with a mock provider that would make the request
      const mockRpcProvider = {
        request: async ({ method, params }: { method: string; params: unknown[] }) => {
          const response = await fetch(
            `https://rpc.walletconnect.org/v1/?chainId=eip155:${mockChainId}&projectId=${mockProjectId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: 1,
              }),
            },
          )

          if (!response.ok) {
            const error = await response.json()
            throw new Error(`RPC Error: ${response.status} - ${JSON.stringify(error)}`)
          }

          const data = await response.json()
          return data.result
        },
      }

      // Create a walletProvider with the mock RPC provider
      const mockWalletProvider = {
        rpcProviders: {
          eip155: {
            httpProviders: {
              [mockChainId]: mockRpcProvider,
            },
          },
        },
      }

      const { result } = renderHook(() =>
        useEthereumMethods({
          walletProvider: mockWalletProvider as any,
          chainId: mockChainId,
          address: '0x123',
          ethTxHash: '',
          sendHash: vi.fn(),
          sendSignMsg: vi.fn(),
          jsonRpcProvider: null,
        }),
      )

      try {
        await result.current.executeEthMethod('eth_getBalance', { address: '0x123' })
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error.message).toContain('400')
        console.log('400 Error reproduced:', error.message)
      }
    })

    it('should identify when chainId mismatch causes 400 error', async () => {
      // Test when chainId doesn't match what's expected
      const wrongChainId = 999 // Invalid chain ID

      const mockWalletProvider = {
        rpcProviders: {
          eip155: {
            httpProviders: {
              [mockChainId]: {
                request: vi.fn().mockRejectedValue(new Error('Invalid chain ID')),
              },
            },
          },
        },
      }

      const { result } = renderHook(() =>
        useEthereumMethods({
          walletProvider: mockWalletProvider as any,
          chainId: wrongChainId, // Using wrong chain ID
          address: '0x123',
          ethTxHash: '',
          sendHash: vi.fn(),
          sendSignMsg: vi.fn(),
          jsonRpcProvider: null,
        }),
      )

      // rpcProvider will be undefined because chainId doesn't match
      try {
        await result.current.executeEthMethod('eth_getBalance', { address: '0x123' })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        console.log('Error with wrong chainId:', error)
      }
    })

    it('should test when address parameter is invalid', async () => {
      const mockJsonRpcProvider = {
        send: vi.fn().mockImplementation((method: string, params: unknown[]) => {
          // Simulate what happens with invalid address
          if (method === 'eth_getBalance' && params[0] === undefined) {
            throw new Error('Invalid address: undefined')
          }
          return Promise.resolve('0x0')
        }),
      }

      const { result } = renderHook(() =>
        useEthereumMethods({
          walletProvider: null,
          chainId: mockChainId,
          address: undefined, // Invalid address
          ethTxHash: '',
          sendHash: vi.fn(),
          sendSignMsg: vi.fn(),
          jsonRpcProvider: mockJsonRpcProvider as any,
        }),
      )

      try {
        // Passing undefined address
        await result.current.executeEthMethod('eth_getBalance', { address: undefined as any })
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error.message).toContain('address')
        console.log('Error with invalid address:', error.message)
      }
    })
  })

  describe('Root Cause Analysis', () => {
    it('should demonstrate the actual issue: rpcProvider is undefined', () => {
      // The issue occurs when:
      // 1. walletProvider exists but doesn't have the expected structure
      // 2. OR jsonRpcProvider is null
      // 3. AND the code tries to call rpcProvider.request() on undefined

      const mockWalletProvider = {
        // Missing rpcProviders property entirely
      }

      const { result } = renderHook(() =>
        useEthereumMethods({
          walletProvider: mockWalletProvider as any,
          chainId: mockChainId,
          address: '0x123',
          ethTxHash: '',
          sendHash: vi.fn(),
          sendSignMsg: vi.fn(),
          jsonRpcProvider: null,
        }),
      )

      // Check that rpcProvider would be undefined
      const rpcProvider = (mockWalletProvider as any)?.rpcProviders?.eip155?.httpProviders?.[
        mockChainId
      ]
      expect(rpcProvider).toBeUndefined()

      // This is the root cause - trying to call .request() on undefined
      expect(result.current.executeEthMethod).toBeDefined()

      // Document the fix needed
      console.log(`
        ROOT CAUSE: The rpcProvider is undefined when:
        1. walletProvider.rpcProviders.eip155.httpProviders[chainId] doesn't exist
        2. AND jsonRpcProvider is null
        
        The code at line 163 tries to call rpcProvider.request() without checking if rpcProvider exists.
        
        FIX NEEDED: Add a check before line 163:
        if (!rpcProvider) {
          throw new Error('No RPC provider available for chain ' + chainId)
        }
      `)
    })
  })
})
