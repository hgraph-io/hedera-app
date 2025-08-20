# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Code Quality Rules

**IMPORTANT**: After making any code changes, you MUST run `npm run prettier` to format the code
before committing. This ensures consistent code formatting across the codebase.

## Commands

### Development

```bash
# Install dependencies
npm install

# Run development server (port 5173)
npm run dev

# Build for production
npm run build

# Run tests with coverage
npm run test

# Lint code
npm run lint

# Format code with Prettier
npm run prettier

# Preview production build
npm run preview
```

## Architecture Overview

### Core Structure

This is a React application that demonstrates integration with Hedera blockchain using both
native Hedera APIs and Ethereum JSON-RPC compatibility layer. The app uses Reown AppKit for
wallet connectivity.

### Key Integration Points

1. **Dual Protocol Support**
   - Native Hedera integration via `hedera` namespace (supports all Hedera account types and
     transactions)
   - EVM compatibility via `eip155` namespace (for Ethereum-compatible wallets, ECDSA accounts
     only)

2. **Wallet Connection**
   - Uses `@hashgraph/hedera-wallet-connect` for Hedera-specific functionality
   - Implements Universal Provider pattern for multi-protocol support
   - Two adapters configured: `nativeHederaAdapter` and `eip155HederaAdapter`

3. **Configuration Architecture**
   - Central configuration in `src/config/index.ts` manages providers, adapters, and network
     settings
   - Environment variables required:
     - `VITE_REOWN_PROJECT_ID` (mandatory)
     - `VITE_HEDERA_RPC_URL` (optional, defaults to hgraph.io testnet)

4. **Hook Pattern**
   - `useHederaMethods`: Handles native Hedera transactions (sign, execute, query)
   - `useEthereumMethods`: Handles EVM-compatible operations

5. **Component Structure**
   - `App.tsx`: Main component managing modal creation and session handling
   - `ActionButtonList`: UI for triggering blockchain operations
   - `InfoList`: Displays transaction results and network information
   - `Modal`: Reusable modal component
   - `ErrorBoundary`: Error handling wrapper

### Testing Strategy

- Uses Vitest with React Testing Library
- Test files located in `tests/` directory mirroring source structure
- Coverage reporting configured with v8 provider
- Setup file at `setupTests.ts` for test environment configuration

### Build Configuration

- Vite-based build system with React plugin
- TypeScript project with composite configuration (app + node)
- ESM modules with polyfills for Node.js compatibility
- Target: ESNext for modern JavaScript features

### Important Considerations

- Ed25519 accounts not supported in EVM mode
- Automatic disconnect handling for session/pairing deletions
- Debug logging enabled for Universal Provider
- Light theme enforced, analytics enabled, social features disabled

## Commit Message Format

When creating commits, use clear, descriptive messages without AI attribution. Example format:

```
Add feature description

- Bullet point of key changes
- Another important change
- Technical improvements made

Additional context about the changes.
```

Avoid including:

- "🤖 Generated with [Claude Code]" signatures
- "Co-Authored-By: Claude" attributions
- External links in commit messages
