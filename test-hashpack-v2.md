# Testing HashPack V2 Compatibility

## Configuration

The demo app has been updated to use the latest `hedera-wallet-connect` library with the
`namespaceMode` parameter set to `'required'` for both adapters.

### Current adapter configuration:

```typescript
// Native Hedera adapter - uses 'required' mode
export const nativeHederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet],
  namespace: hederaNamespace,
  namespaceMode: 'required', // This ensures HashPack responds to hedera namespace
})

// EIP155 adapter - also uses 'required' mode
export const eip155HederaAdapter = new HederaAdapter({
  projectId,
  networks: [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet],
  namespace: 'eip155',
  namespaceMode: 'required', // Explicit namespace selection
})
```

## How This Fixes the HashPack Issue

### Previous Problem:

- HederaConnector was using `optionalNamespaces` by default
- HashPack ignores optional namespaces and defaults to eip155
- When selecting "hedera" namespace, HashPack would still connect with eip155

### Solution:

- The `namespaceMode: 'required'` parameter changes HederaConnector behavior
- Now uses `requiredNamespaces` instead of `optionalNamespaces`
- HashPack must respond to the specific namespace requested

## Testing Steps

1. **Start the demo app:**

   ```bash
   npm run dev
   ```

2. **Test HWC v2 with native Hedera namespace:**
   - Click "Connect with HWC v2"
   - Select "Hedera (Native)" option
   - Choose HashPack from the wallet list
   - HashPack should now correctly connect with the hedera namespace
   - Verify in the UI: "Connected via HWC v2 (hedera namespace)"

3. **Test HWC v2 with EIP-155 namespace:**
   - Disconnect if connected
   - Click "Connect with HWC v2"
   - Select "EIP-155 (Ethereum Compatible)"
   - Choose HashPack
   - Should connect with eip155 namespace
   - Verify in the UI: "Connected via HWC v2 (eip155 namespace)"

4. **Test HWC v2 with both namespaces:**
   - Disconnect if connected
   - Click "Connect with HWC v2"
   - Select "Both Namespaces"
   - Choose HashPack
   - HashPack will be required to connect with both namespaces
   - Verify in the UI: Shows both Hedera and EIP-155 accounts

## Expected Results

With `namespaceMode: 'required'`:

- ✅ HashPack respects the hedera namespace selection
- ✅ Connection shows correct namespace in UI
- ✅ Native Hedera methods work when hedera namespace is selected
- ✅ EVM methods work when eip155 namespace is selected
- ✅ Both sets of methods work when both namespaces are selected

## Technical Details

The key change in HederaConnector when `namespaceMode: 'required'`:

```typescript
// In HederaConnector.ts
const connectParams =
  this.namespaceMode === 'required'
    ? { requiredNamespaces: namespaces }
    : { optionalNamespaces: namespaces }

await this.provider.connect(connectParams)
```

This forces wallets to acknowledge and connect with the specific namespaces requested, rather
than choosing their preferred namespace from optional ones.
