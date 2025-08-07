# HashPack V2 Connection Analysis

## Key Discovery: HashPack-Specific Event Requirement

HashPack appears to require a specific event in the connection parameters:

- **V1 Working**: `"events": ["https://walletconnect.hashpack.app"]`
- **V2 Standard**: `"events": ["accountsChanged", "chainChanged"]`

This special URL event appears to be how HashPack identifies Hedera-compatible dApps.

## Connection Payload Comparison

### V1 (Working with HashPack)

```json
{
  "network": "testnet",
  "requiredNamespaces": {
    "hedera": {
      "chains": ["hedera:testnet"],
      "methods": [
        "hedera_getNodeAddresses",
        "hedera_executeTransaction",
        "hedera_signMessage",
        "hedera_signAndExecuteQuery",
        "hedera_signAndExecuteTransaction",
        "hedera_signTransaction"
      ],
      "events": ["https://walletconnect.hashpack.app"] // ← HashPack-specific
    }
  }
}
```

### V2 (Not Working with HashPack)

```json
{
  "requiredNamespaces": {
    "hedera": {
      "methods": [
        "hedera_getAccountBalance", // ← Extra method not in V1
        "hedera_getAccountInfo", // ← Extra method not in V1
        "hedera_getTransactionReceipt", // ← Extra method not in V1
        "hedera_executeTransaction",
        "hedera_signMessage",
        "hedera_signTransaction",
        "hedera_signAndExecuteTransaction",
        "hedera_signAndExecuteQuery"
      ],
      "chains": ["hedera:testnet", "hedera:mainnet"],
      "events": ["chainChanged", "accountsChanged"] // ← Standard events
    }
  }
}
```

## Issues Identified

1. **Event Mismatch**:
   - V1 uses HashPack's special URL event
   - V2 uses standard WalletConnect events
   - We've updated the library to use HashPack's event for hedera namespace

2. **Method Differences**:
   - V1: 6 methods from `HederaJsonRpcMethod` enum
   - V2: App.tsx manually adds 3 extra methods that aren't in the standard enum
   - These extra methods might confuse HashPack

3. **Chain Differences**:
   - V1: Single chain `["hedera:testnet"]`
   - V2: Multiple chains `["hedera:testnet", "hedera:mainnet"]`

## What We've Fixed

1. **Updated `chains.ts`** to use HashPack's special event for hedera namespace:

```typescript
const events =
  chainNamespace === ('hedera' as ChainNamespace)
    ? ['https://walletconnect.hashpack.app']
    : ['accountsChanged', 'chainChanged']
```

2. **Added detailed logging** to see exact payloads being sent

## Current Status

Even with the HashPack-specific event, HashPack still shows "This doesn't appear to be a Hedera
compatible dapp" for V2 connections.

## Possible Reasons

1. **HashPack may be hardcoded to only work with DAppConnector (V1)**
   - It might check for specific initialization patterns
   - It might not recognize Reown AppKit connections

2. **Additional validation HashPack might be doing**:
   - Checking the dApp metadata format
   - Looking for specific session properties
   - Verifying the connector type

3. **The extra methods in V2 might be problematic**
   - But these are defined in App.tsx, not actually sent by the connector

## Next Steps to Try

1. **Match V1 exactly**: Ensure V2 sends identical payload to V1
2. **Test with single chain**: Try only testnet like V1
3. **Remove extra methods**: Don't include the additional methods in App.tsx
4. **Check HashPack's source**: See if there's public documentation on their requirements

## Conclusion

HashPack appears to have specific requirements for recognizing Hedera dApps that go beyond just
the namespace and methods. The special event URL `https://walletconnect.hashpack.app` is one
requirement, but there may be others that are not documented.

The fundamental issue appears to be that HashPack's WalletConnect v2 implementation may only
support EIP-155 connections and not native Hedera namespace connections through the Reown
AppKit, regardless of how we configure it.
