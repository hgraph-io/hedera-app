# Hedera WalletConnect Demo App

A comprehensive demo application showcasing integration of Hedera with HWC (Hedera
WalletConnect) v1 and v2 implementations. This app demonstrates best practices for developers
building dApps on Hedera using the `@hashgraph/hedera-wallet-connect` library.

> **Protocol Clarification**: Both HWC v1 and HWC v2 use the WalletConnect 2.0 protocol. The
> version numbers refer to different implementations of the Hedera integration, not the
> underlying WalletConnect protocol version.

## 🎯 Purpose

This demo app serves as a reference implementation for developers integrating Hedera wallets
into their dApps. It demonstrates:

- **Dual Implementation Support**: Both HWC v1 (DAppConnector) and HWC v2 (Reown AppKit)
- **Multi-Namespace Support**: Native Hedera protocol and EVM compatibility layer
- **Complete Feature Set**: All major Hedera operations including transfers, signing, and
  queries
- **Real-World Patterns**: Error handling, session management, and UI/UX best practices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A [Reown Cloud](https://cloud.reown.com) project ID (free)
- A Hedera testnet account (get one at [portal.hedera.com](https://portal.hedera.com))

### Installation

```bash
# Clone and navigate to the demo
cd demos/hedera-app

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your VITE_REOWN_PROJECT_ID

# Run the development server
npm run dev
```

Visit http://localhost:5173 to see the app.

## 🏗️ Architecture Overview

### Connection Methods

The app supports two Hedera WalletConnect implementations (both use WalletConnect 2.0 protocol):

#### HWC v1 (DAppConnector)

- Uses `DAppConnector` class from `@hashgraph/hedera-wallet-connect`
- **Always** uses the `hedera` namespace
- Direct WalletConnect 2.0 integration
- Supports QR code and browser extension connections
- Most mature implementation with widest wallet support

#### HWC v2 (Reown AppKit)

- Uses Reown AppKit with custom Hedera adapters
- Modern, modular architecture
- Supports three namespace options:
  1. **Hedera Namespace** (`hedera:`): Native Hedera protocol
  2. **EIP-155 Namespace** (`eip155:`): Ethereum compatibility
  3. **Both Namespaces**: Maximum compatibility

### Key Components

```
src/
├── App.tsx                          # Main app with v1/v2 support & namespace selection
├── config/
│   └── index.ts                     # WalletConnect configuration
├── hooks/
│   ├── useDAppConnectorV1.ts       # v1 connection management
│   ├── useV1Methods.ts             # v1 transaction methods
│   ├── useHederaMethods.ts         # v2 native Hedera methods
│   └── useEthereumMethods.ts       # v2 EVM-compatible methods
├── components/
│   ├── ConnectionWrapper.tsx        # Session validation wrapper
│   ├── V1ConnectionModal.tsx       # v1 connection UI
│   ├── V2NamespaceModal.tsx        # v2 namespace selection
│   └── ActionButtonList.tsx        # Transaction UI components
└── utils/
    ├── sessionMonitor.ts           # Session health monitoring
    └── methodConfigs.ts            # Method parameter definitions
```

## 🔗 Integration Guide

### Step 1: Choose Your Connection Method

#### For Maximum Compatibility

Support both HWC implementations to reach all Hedera wallets:

```typescript
// Support both HWC implementations (both use WalletConnect 2.0)
import { DAppConnector } from '@hashgraph/hedera-wallet-connect' // HWC v1
import { createAppKit } from '@reown/appkit/react' // HWC v2
```

#### For Modern Apps (HWC v2 Only)

If targeting newer wallets with AppKit support:

```typescript
import { createAppKit } from '@reown/appkit/react'
import { HederaAdapter } from '@hashgraph/hedera-wallet-connect'
```

### Step 2: Understand Namespace Implications

| Namespace | Account Types   | Transaction Types              | Best For                  | HashPack Support |
| --------- | --------------- | ------------------------------ | ------------------------- | ---------------- |
| `hedera:` | Ed25519 & ECDSA | Native Hedera (HTS, HCS, etc.) | Hedera-native features    | v1 only          |
| `eip155:` | ECDSA only      | EVM-compatible                 | Cross-chain compatibility | v1 & v2          |
| Both      | All types       | All types                      | Maximum flexibility       | v2 (eip155 only) |

> **⚠️ HashPack Limitation**: HashPack's v2 implementation currently only supports the `eip155`
> namespace. Use v1 for native Hedera features or Ed25519 accounts.

### Step 3: Implement Core Features

#### Connecting a Wallet

```typescript
// HWC v1 Connection (uses WalletConnect 2.0 protocol)
const connector = new DAppConnector(
  metadata,
  LedgerId.TESTNET,
  projectId,
  Object.values(HederaJsonRpcMethod),
  ['https://walletconnect.hashpack.app'],
)
await connector.init()
const session = await connector.connect()

// HWC v2 Connection with namespace selection (also WalletConnect 2.0)
const connectionOptions = {
  requiredNamespaces: {
    hedera: {
      methods: ['hedera_signMessage', 'hedera_executeTransaction'],
      chains: ['hedera:testnet', 'hedera:mainnet'],
      events: ['chainChanged', 'accountsChanged'],
    },
  },
}
```

#### Executing Transactions

```typescript
// Native Hedera transaction
const transaction = new TransferTransaction()
  .addHbarTransfer(fromAccount, new Hbar(-1))
  .addHbarTransfer(toAccount, new Hbar(1))

const result = await signer.signAndExecuteTransaction(transaction)

// EVM-compatible transaction
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [
    {
      from: account,
      to: recipient,
      value: '0x1',
      gas: '0x5208',
    },
  ],
})
```

### Step 4: Handle Edge Cases

The demo includes patterns for:

- **Session Recovery**: Automatic reconnection on page refresh
- **Error Handling**: Graceful degradation when operations fail
- **Network Switching**: Handling mainnet/testnet transitions
- **Account Changes**: Responding to wallet account switches
- **Disconnection**: Clean session termination

## 🧪 Testing

```bash
# Run all tests with coverage
npm run test

# Run specific test suites
npm run test -- tests/components/V2NamespaceModal.test.tsx

# Generate coverage report
npm run coverage
```

## 🐳 Docker Support

```bash
# Build the image
docker build -t hedera-app .

# Run with your project ID
docker run --rm -p 5173:5173 \
  -e VITE_REOWN_PROJECT_ID=<your_project_id> \
  hedera-app
```

## 📚 Key Files for Integration Reference

| File                              | Purpose                  | Key Patterns                            |
| --------------------------------- | ------------------------ | --------------------------------------- |
| `src/hooks/useDAppConnectorV1.ts` | v1 connection lifecycle  | Extension detection, session management |
| `src/App.tsx`                     | Main integration example | Protocol selection, namespace handling  |
| `src/config/index.ts`             | WalletConnect setup      | Adapter configuration, network setup    |
| `src/utils/sessionMonitor.ts`     | Session health           | Validation, recovery, cleanup           |

## ⚠️ Important Considerations

### Account Type Compatibility

- **Ed25519 accounts**: Only supported in `hedera:` namespace
- **ECDSA accounts**: Supported in both namespaces
- Choose namespace based on your user's account types

### Network Configuration

- Testnet is default for development
- Mainnet requires explicit configuration
- RPC URL defaults to hgraph.io (configurable via `VITE_HEDERA_RPC_URL`)

### Session Management

- Sessions persist across page refreshes
- Automatic cleanup of invalid sessions
- Maximum 3 refresh attempts to prevent loops

## 🔍 Debugging

Enable debug output:

```javascript
// In browser console
localStorage.setItem('DEBUG', 'universal-provider')
```

Common issues:

- **"No signer available"**: Ensure wallet is connected and account is selected
- **"Extension not detected"**: Wait for extension to load or refresh
- **"Connection state mismatch"**: Clear session storage and reconnect

## 🤝 Wallet Compatibility

Tested with:

- **HashPack**:
  - ✅ Full v1 support (hedera namespace)
  - ⚠️ v2 limited to eip155 namespace (hedera namespace not recognized)
  - 💡 For Ed25519 accounts or native Hedera features, use v1
- **Kabila**: v1 support
- **Other WalletConnect wallets**: Varies by implementation

> **Note**: HashPack's v2 implementation currently only recognizes the `eip155` namespace. If
> you need to use Ed25519 accounts or native Hedera features with HashPack, use the v1
> connection method.

## 📖 Additional Resources

- [Hedera WalletConnect Library](https://github.com/hashgraph/hedera-wallet-connect)
- [Reown AppKit Documentation](https://docs.reown.com/appkit/overview)
- [Hedera Developer Portal](https://docs.hedera.com)
- [Hedera JSON-RPC Relay](https://github.com/hashgraph/hedera-json-rpc-relay)
- [WalletConnect Protocol Specs](https://specs.walletconnect.com)

## 🆘 Support

For issues specific to this demo:

- Open an issue in this repository

For library-specific questions:

- `@hashgraph/hedera-wallet-connect`:
  [GitHub Issues](https://github.com/hashgraph/hedera-wallet-connect/issues)
- Reown AppKit: [Reown Support](https://docs.reown.com)

## 📄 License

Apache 2.0 - See LICENSE file for details
