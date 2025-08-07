# Required vs Optional Namespaces Investigation

## Key Finding

The namespace specification method (`requiredNamespaces` vs `optionalNamespaces`) appears to be
a critical factor in the HashPack v2 hedera namespace issue.

## Current Implementation Analysis

### HederaConnector Behavior

The `HederaConnector` class uses `optionalNamespaces` by default:

```typescript
// src/reown/connectors/HederaConnector.ts
async connectWalletConnect() {
  await this.provider.connect({
    optionalNamespaces: createNamespaces(this.caipNetworks),
  })
}
```

### App Implementation

The demo app attempts to use `requiredNamespaces`:

```typescript
// src/App.tsx
const connectionOptions = {
  requiredNamespaces: {
    hedera: {
      methods: hederaMethods,
      chains: ['hedera:testnet', 'hedera:mainnet'],
      events: ['chainChanged', 'accountsChanged'],
    },
  },
}
```

## The Problem

1. **Configuration Not Applied**: The `connectionOptions` we set are stored in sessionStorage
   but not actually used by the AppKit connection flow
2. **Default Behavior**: HederaConnector always uses `optionalNamespaces` with all configured
   networks
3. **No Override Mechanism**: There's no clear way to override the namespace requirements when
   using AppKit

## Implications for HashPack

### Why This Matters

- **optionalNamespaces**: Wallet can choose which namespaces to support (HashPack might be
  choosing only eip155)
- **requiredNamespaces**: Wallet must support all specified namespaces or connection fails

### HashPack's Likely Behavior

When presented with:

```javascript
optionalNamespaces: {
  hedera: { ... },
  eip155: { ... }
}
```

HashPack appears to:

1. See both namespaces as optional
2. Choose to only implement `eip155` (which it knows how to handle)
3. Ignore `hedera` namespace (which it might not recognize or support in v2)

## Potential Solutions

### Solution 1: Modify HederaConnector

Allow passing namespace requirements through configuration:

```typescript
// Hypothetical fix in HederaConnector
async connectWalletConnect(options?: { requiredNamespaces?: any }) {
  await this.provider.connect({
    requiredNamespaces: options?.requiredNamespaces,
    // or
    optionalNamespaces: options?.optionalNamespaces || createNamespaces(this.caipNetworks),
  })
}
```

### Solution 2: Direct Provider Connection

Bypass AppKit and connect directly to the provider:

```typescript
// Direct connection with specific requirements
await universalProvider.connect({
  requiredNamespaces: {
    hedera: { ... }
  }
})
```

### Solution 3: Separate Adapters

Use different adapters for different namespace requirements:

```typescript
// Create adapter specifically for hedera namespace
const hederaOnlyAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.Native.Testnet],
  namespace: 'hedera',
  // Force required namespace somehow
})
```

## Testing Required vs Optional

To test if this is the issue:

1. **Test with requiredNamespaces**: Force hedera as required and see if HashPack rejects
2. **Test with only hedera in optionalNamespaces**: Remove eip155 option entirely
3. **Test with hedera as required, eip155 as optional**: Mixed approach

## Workaround Recommendations

### For Current Implementation

Since we can't easily override the namespace requirements:

1. **Continue using v1 for HashPack**: Most reliable for hedera namespace
2. **Use eip155 for v2**: Works but limited to ECDSA accounts
3. **Document the limitation**: Clear user guidance

### For Library Improvements

The hedera-wallet-connect library could:

1. **Add namespace configuration**: Allow apps to specify required vs optional
2. **Provide direct connection method**: Bypass AppKit when needed
3. **Add wallet detection**: Auto-configure based on wallet capabilities

## Code Example - What We Need

```typescript
// Ideal API for controlling namespace requirements
createAppKit({
  adapters: [
    new HederaAdapter({
      projectId,
      networks: [...],
      namespace: 'hedera',
      namespaceMode: 'required', // New option
    })
  ],
  // or
  connectionOptions: {
    requiredNamespaces: { hedera: {...} },
    optionalNamespaces: { eip155: {...} }
  }
})
```

## Conclusion

The use of `optionalNamespaces` by default in HederaConnector, combined with no mechanism to
override this behavior through AppKit, appears to be why HashPack can ignore the hedera
namespace in v2 connections. The wallet sees it as optional and chooses not to implement it.

This is a library-level issue that would require changes to hedera-wallet-connect to properly
support forcing specific namespace requirements.
