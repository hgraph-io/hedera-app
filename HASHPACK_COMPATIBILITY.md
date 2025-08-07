# HashPack WalletConnect v2 Compatibility

## Current Status

HashPack's WalletConnect v2 implementation **does not support the native `hedera` namespace**.
When connecting via WalletConnect v2 (using Reown AppKit), HashPack only recognizes and responds
to the `eip155` namespace.

## What This Means

### Working Configuration ✅

- **Namespace**: `eip155`
- **Chain IDs**: `eip155:296` (testnet), `eip155:295` (mainnet)
- **Account Type**: ECDSA accounts only
- **Transactions**: EVM-compatible transactions via Hedera JSON-RPC Relay
- **Methods**: Ethereum JSON-RPC methods (eth_sendTransaction, personal_sign, etc.)

### Not Working Configuration ❌

- **Namespace**: `hedera`
- **Error**: "This does not appear to be a Hedera compatible dapp"
- **Reason**: HashPack's WalletConnect v2 implementation doesn't recognize the `hedera`
  namespace

## Technical Details

### The Problem

1. The hedera-wallet-connect library correctly implements the `hedera` namespace for native
   Hedera operations
2. We set `namespaceMode: 'required'` to force wallets to use requiredNamespaces
3. However, HashPack's wallet implementation doesn't handle the `hedera` namespace in
   WalletConnect v2
4. When HashPack sees a dApp requesting the `hedera` namespace, it shows the error message

### Why This Happens

- HashPack v2 was built primarily for EVM compatibility
- The wallet checks for supported namespaces and only recognizes `eip155`
- Even when we use `requiredNamespaces` with `hedera`, HashPack rejects the connection

## Workarounds

### For HashPack Users

#### Option 1: Use HWC v1 (Recommended)

```javascript
// HWC v1 fully supports native Hedera operations with HashPack
const connector = new DAppConnector(metadata, network, projectId)
await connector.init()
```

#### Option 2: Use EIP-155 Namespace in v2

- Select "EIP-155 (Ethereum Compatible)" when connecting
- Limited to ECDSA accounts only
- Uses EVM-compatible transaction format

### For Developers

If you need to support HashPack with WalletConnect v2:

1. **Use EIP-155 namespace only**:

```typescript
const adapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
  namespace: 'eip155',
  namespaceMode: 'required',
})
```

2. **Detect HashPack and route appropriately**:

```typescript
// Check if wallet is HashPack
const isHashPack = session?.peer?.metadata?.name?.includes('HashPack')

if (isHashPack) {
  // Use eip155 methods only
} else {
  // Can potentially use hedera namespace with other wallets
}
```

## Future Support

The `hedera` namespace in WalletConnect v2 is properly implemented in the hedera-wallet-connect
library and is ready for wallets that choose to support it. When HashPack or other wallets add
support for the native `hedera` namespace in their WalletConnect v2 implementation, it will work
automatically with this library.

## Summary

| Feature                    | HWC v1 with HashPack | HWC v2 with HashPack |
| -------------------------- | -------------------- | -------------------- |
| Native Hedera namespace    | ✅ Supported         | ❌ Not supported     |
| EIP-155 namespace          | N/A                  | ✅ Supported         |
| Ed25519 accounts           | ✅ Supported         | ❌ Not supported     |
| ECDSA accounts             | ✅ Supported         | ✅ Supported         |
| Native Hedera transactions | ✅ Supported         | ❌ Not supported     |
| EVM transactions           | ❌ Not supported     | ✅ Supported         |

## Recommendations

1. **For full Hedera functionality with HashPack**: Use HWC v1
2. **For EVM compatibility with HashPack**: Use HWC v2 with eip155 namespace
3. **For future-proofing**: Implement both v1 and v2, let users choose based on their needs
