# Namespace Verification for V1 and V2 Connections

## Summary

Both V1 (DAppConnector) and V2 (Reown AppKit) connections can use the **same `hedera`
namespace**.

## V1 Connection (DAppConnector)

- **Always uses**: `hedera` namespace
- **Cannot use**: `eip155` namespace
- Source: `networkNamespaces` function in `hedera-wallet-connect/src/lib/shared/utils.ts`

```typescript
export const networkNamespaces = (
  ledgerId: LedgerId,
  methods: string[],
  events: string[],
): ProposalTypes.RequiredNamespaces => ({
  hedera: {
    // <-- Always 'hedera'
    chains: [ledgerIdToCAIPChainId(ledgerId)],
    methods,
    events,
  },
})
```

## V2 Connection (Reown AppKit)

- **Can use either**:
  - `hedera` namespace (Native Hedera protocol)
  - `eip155` namespace (Ethereum compatibility)
- User selects which namespace via the V2NamespaceModal
- Source: `App.tsx`

```typescript
requiredNamespaces: namespace === 'hedera'
  ? {
      hedera: {
        // <-- Can be 'hedera'
        methods: hederaMethods,
        chains: ['hedera:testnet', 'hedera:mainnet'],
        events: ['chainChanged', 'accountsChanged'],
      },
    }
  : {
      eip155: {
        // <-- Or 'eip155'
        methods: eip155Methods,
        chains: ['eip155:296', 'eip155:295'],
        events: ['chainChanged', 'accountsChanged'],
      },
    }
```

## Important Implications

### 1. Namespace Overlap

- When V2 connects with `hedera` namespace, it uses the **exact same namespace** as V1
- Both V1 and V2 hedera connections will have `session.namespaces.hedera`
- This makes it difficult to distinguish V1 from V2 just by looking at namespaces

### 2. Session Detection Issue Fixed

The original code incorrectly assumed V1 sessions wouldn't have a `hedera` namespace:

```typescript
// INCORRECT - V1 sessions DO have hedera namespace
if (currentSession &&
    !currentSession.namespaces?.hedera &&
    !currentSession.namespaces?.eip155) {
```

Fixed to:

```typescript
// CORRECT - V1 sessions have the hedera namespace
if (currentSession && currentSession.namespaces?.hedera) {
```

### 3. Distinguishing V1 from V2

Since both can use `hedera` namespace, the apps distinguish them by:

- Checking which connector/provider has an active session
- V1: Uses `DAppConnector` with its own WalletConnect client
- V2: Uses `universalProvider` (HederaProvider) with Reown AppKit

### 4. Account Format

Both V1 and V2 use the same CAIP-10 account format when using `hedera` namespace:

- Format: `hedera:<network>:<accountId>`
- Example: `hedera:testnet:0.0.12345`

## Conclusion

**YES, the namespace for "hedera" in V2 connections is the same as the V1 connector** - both use
the literal string `"hedera"` as the namespace identifier when connecting with native Hedera
protocol.
