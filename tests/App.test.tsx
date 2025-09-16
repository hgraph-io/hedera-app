import { render } from '@testing-library/react'
import { describe, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

const disconnectMock = vi.fn()

vi.mock('@reown/appkit/react', () => ({
  createAppKit: vi.fn(),
  useDisconnect: () => ({
    disconnect: disconnectMock,
  }),
}))

vi.mock('../src/components/ActionButtonList', () => ({
  ActionButtonList: () => <div data-testid="action-list" />,
}))

vi.mock('../src/components/InfoList', () => ({
  InfoList: () => <div data-testid="info-list" />,
}))

vi.mock('../src/config', () => ({
  DEFAULT_RPC_URL: 'https://testnet.hashio.io/api',
  projectId: 'test',
  metadata: {},
  networks: [],
  nativeHederaAdapter: {},
  eip155HederaAdapter: {},
  universalProvider: {
    on: vi.fn(),
    off: vi.fn(),
    client: { core: { pairing: { events: { on: vi.fn(), off: vi.fn() } } } },
    session: null as any,
  },
}))

import App from '../src/App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    disconnectMock.mockReset()
  })

  it('renders without crashing', () => {
    render(<App />)
  })
})
