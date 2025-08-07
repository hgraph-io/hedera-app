# Both Namespaces Feature

## Overview

Added a third option to the V2 connection modal that allows users to connect with both `hedera`
and `eip155` namespaces simultaneously.

## What Changed

### 1. V2NamespaceModal Component

- Added "both" as a third option alongside "hedera" and "eip155"
- Shows clear description: "Both Namespaces (hedera: + eip155:)"
- Highlights the benefits:
  - Maximum compatibility with all features
  - Supports both Ed25519 and ECDSA accounts
  - Can use native Hedera or EVM transactions
  - Best for wallets supporting multiple protocols

### 2. Connection Handler (App.tsx)

- Updated `handleV2Connect` to accept 'both' as a namespace option
- When "both" is selected, creates `requiredNamespaces` with both:
  ```typescript
  requiredNamespaces: {
    hedera: { methods, chains, events },
    eip155: { methods, chains, events }
  }
  ```

### 3. Display Logic

- Updated `getCurrentV2Namespace()` to detect and return 'both' when both namespaces are present
- Shows both account addresses when connected with both namespaces:
  - Hedera Account: hedera:testnet:0.0.xxxxx
  - EIP-155 Account: eip155:296:0xxxxxxxxxxx

## User Experience

1. User clicks "Connect with HWC v2"
2. Modal shows three options:
   - **Hedera Namespace**: Native protocol, all account types
   - **EIP-155 Namespace**: Ethereum compatibility, ECDSA only
   - **Both Namespaces**: Maximum compatibility (NEW)
3. User selects "Both Namespaces"
4. Wallet prompts to approve both namespace connections
5. Once connected, user can use both native Hedera and EVM methods

## Benefits

- **Flexibility**: Users don't have to choose between protocols
- **Compatibility**: Works with wallets that support multiple namespaces
- **Convenience**: Single connection for all features
- **Future-proof**: Ready for apps that might use both protocols

## Technical Details

- Type safety maintained with TypeScript union type: `'hedera' | 'eip155' | 'both'`
- Backward compatible - existing code continues to work
- Clean separation of concerns - namespace selection logic is centralized
- Comprehensive test coverage added

## Files Modified

1. `/src/components/V2NamespaceModal.tsx` - Added "both" option UI
2. `/src/App.tsx` - Updated connection logic
3. `/src/components/V2ConnectionOptions.tsx` - Added "both" option (for consistency)
4. `/tests/components/V2NamespaceModal.test.tsx` - New test file with full coverage

## Testing

Run the new tests:

```bash
npm run test -- tests/components/V2NamespaceModal.test.tsx
```

All 11 tests pass, covering:

- Rendering all three options
- Selection state management
- Connection with each namespace type
- Modal interactions (cancel, close)
