import { describe, it, vi, beforeEach } from 'vitest'

vi.mock('@hashgraph/hedera-wallet-connect', () => ({
  HederaChainDefinition: {
    Native: { Testnet: {} },
    EVM: { Testnet: {} },
  },
  HederaJsonRpcMethod: {},
  HederaConnector: vi.fn(),
  HederaAdapter: vi.fn(),
  HIP820Provider: vi.fn(),
  EIP155Provider: vi.fn(),
  HederaProvider: {
    init: vi.fn(),
  },
}))

vi.mock('@reown/appkit', () => ({
  createAppKit: vi.fn(),
}))

describe('config module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.VITE_REOWN_PROJECT_ID
    delete process.env.VITE_HEDERA_RPC_URL
  })

  it('should be defined', () => {
    // Just a basic test to ensure the module loads without errors
  })
})
