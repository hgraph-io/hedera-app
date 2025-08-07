# HashPack HWC v2 Hedera Namespace Issue

## Problem

HashPack wallet does not appear to recognize the `hedera` namespace when connecting via HWC v2
(Reown AppKit implementation).

> **Note**: Both HWC v1 and HWC v2 use the WalletConnect 2.0 protocol. The difference is in the
> implementation approach.

## Current Behavior

- When selecting "Hedera Namespace" in the HWC v2 connection modal, HashPack may not respond or
  connect
- The `eip155` namespace works correctly with HashPack HWC v2
- HashPack HWC v1 connections work correctly (HWC v1 always uses `hedera` namespace)

## Technical Details

### V2 Connection Request

When connecting with v2 and selecting the Hedera namespace, the app sends:

```javascript
requiredNamespaces: {
  hedera: {
    methods: [
      'hedera_getAccountBalance',
      'hedera_getAccountInfo',
      'hedera_executeTransaction',
      'hedera_signMessage',
      // etc.
    ],
    chains: ['hedera:testnet', 'hedera:mainnet'],
    events: ['chainChanged', 'accountsChanged']
  }
}
```

### Root Cause Identified

The issue stems from the use of `optionalNamespaces` vs `requiredNamespaces`:

1. **HederaConnector uses `optionalNamespaces`**: The library's connector always presents
   namespaces as optional
2. **HashPack chooses eip155**: When both namespaces are optional, HashPack only implements
   `eip155`
3. **No override mechanism**: The AppKit integration doesn't allow overriding this behavior

When namespaces are optional, wallets can choose which to support. HashPack appears to:

- Recognize and support `eip155` namespace in v2
- Not recognize or choose not to support `hedera` namespace in v2
- Only connect with the namespace it supports (eip155)

See [REQUIRED_VS_OPTIONAL_NAMESPACES.md](./REQUIRED_VS_OPTIONAL_NAMESPACES.md) for detailed
analysis.

## Workarounds

### For Users

1. **Use HWC v1 Connection**: Connect with "HWC v1" which works correctly with HashPack
2. **Use EIP-155 Namespace**: When using HWC v2, select "EIP-155 Namespace" or "Both Namespaces"
3. **Note**: EIP-155 namespace only supports ECDSA accounts, not Ed25519

### For Developers

1. **Default to EIP-155 for v2**: When targeting HashPack specifically with v2, use the `eip155`
   namespace
2. **Implement Fallback**: Detect connection failures and suggest v1 or eip155 as alternatives
3. **Feature Detection**: Check wallet capabilities before requesting specific namespaces

## Code Example - Fallback Strategy

```typescript
// Try hedera namespace first, fallback to eip155
const tryConnect = async () => {
  try {
    // Try hedera namespace
    await connectWithNamespace('hedera')
  } catch (error) {
    console.warn('Hedera namespace failed, trying eip155...')
    // Fallback to eip155
    await connectWithNamespace('eip155')
  }
}
```

## Status

- **Reported**: This is a known limitation
- **Impact**: Users need to use v1 or eip155 namespace with HashPack
- **Resolution**: Pending HashPack's implementation of native `hedera` namespace support in v2

## Recommendations

### Short Term

- Document this limitation clearly in user-facing documentation
- Default to showing eip155 option first for v2 connections
- Keep v1 support for full HashPack compatibility

### Long Term

- Work with HashPack team to implement `hedera` namespace support in v2
- Consider standardizing namespace usage across all Hedera wallets
- Implement automatic namespace negotiation

## Testing Matrix

| Wallet   | v1 (hedera) | v2 (hedera)       | v2 (eip155) | v2 (both)               |
| -------- | ----------- | ----------------- | ----------- | ----------------------- |
| HashPack | ✅ Works    | ❌ Not recognized | ✅ Works    | ⚠️ Only eip155 connects |
| Kabila   | ✅ Works    | ? Unknown         | ? Unknown   | ? Unknown               |
| Others   | Varies      | Varies            | Varies      | Varies                  |

## Related Issues

- This affects any dApp trying to use native Hedera features with HashPack via v2
- Ed25519 accounts cannot be used when forced to use eip155 namespace
- Some Hedera-specific functionality may not be available through eip155
