# Connection Payload Logging

The application now logs detailed connection information for both V1 and V2 connections to help
understand the differences between them.

## V1 Connection Logs

When connecting via HWC v1, you'll see the following in the console:

### 1. Connection Initiation

```javascript
🔗 V1 Connection: Connecting via extension
// or
🔗 V1 Connection: Opening modal for QR code connection
```

### 2. Connection Parameters (Before Connection)

```javascript
🔗 V1 DAppConnector: Connecting with params: {
  network: "testnet",
  pairingTopic: undefined,
  requiredNamespaces: {
    hedera: {
      chains: ["hedera:testnet"],
      methods: [
        "hedera_getNodeAddresses",
        "hedera_executeTransaction",
        "hedera_signMessage",
        "hedera_signAndExecuteQuery",
        "hedera_signAndExecuteTransaction",
        "hedera_signTransaction"
      ],
      events: []
    }
  },
  supportedMethods: [...],
  supportedEvents: []
}
```

### 3. Connection Established

```javascript
✅ V1 Connection Established: {
  topic: "...",
  peer: { metadata: { name: "HashPack", ... } },
  namespaces: {
    hedera: {
      accounts: ["hedera:testnet:0.0.12345"],
      methods: [...],
      events: [...]
    }
  },
  requiredNamespaces: undefined,
  optionalNamespaces: undefined,
  sessionProperties: { extensionId: "..." },
  expiry: 1234567890,
  acknowledged: true,
  controller: "...",
  self: { publicKey: "...", metadata: {...} }
}
```

### 4. Namespace Details

```javascript
📦 V1 Namespaces Detail: {
  hasHedera: true,
  hasEip155: false,
  hederaAccounts: ["hedera:testnet:0.0.12345"],
  hederaMethods: [...],
  hederaEvents: ["accountsChanged", "chainChanged"],
  eip155Accounts: undefined,
  eip155Methods: undefined,
  eip155Events: undefined
}
```

## V2 Connection Logs

When connecting via HWC v2, you'll see:

### 1. Modal Creation

```javascript
🔗 V2 Connection: Creating modal with namespace: "hedera"
// or "eip155" or "both"

📦 V2 Configuration: Using hedera adapter only with required mode
// or other configurations based on selection
```

### 2. HederaConnector Parameters (During Connection)

```javascript
🔗 V2 HederaConnector: Connecting with params: {
  namespaceMode: "required",
  namespace: "hedera",
  caipNetworks: [
    {
      id: "testnet",
      chainNamespace: "hedera",
      caipNetworkId: "hedera:testnet",
      name: "Hedera Testnet"
    },
    ...
  ],
  generatedNamespaces: {
    hedera: {
      methods: [...],
      events: ["accountsChanged", "chainChanged"],
      chains: ["hedera:testnet", "hedera:mainnet"],
      rpcMap: { ... }
    }
  },
  connectParams: {
    requiredNamespaces: { ... }
    // or optionalNamespaces based on namespaceMode
  }
}
```

### 3. Connection Established

```javascript
✅ V2 Connection Established: {
  topic: "...",
  peer: { metadata: { name: "HashPack", ... } },
  namespaces: {
    // Will show either hedera or eip155 or both
    eip155: {  // HashPack typically only responds with eip155
      accounts: ["eip155:296:0x..."],
      methods: [...],
      events: [...]
    }
  },
  requiredNamespaces: undefined,
  optionalNamespaces: undefined,
  sessionProperties: { ... },
  expiry: 1234567890,
  acknowledged: true,
  controller: "...",
  self: { publicKey: "...", metadata: {...} }
}
```

### 4. Namespace Details

```javascript
📦 V2 Namespaces Detail: {
  hasHedera: false,  // HashPack doesn't support hedera namespace in v2
  hasEip155: true,
  hederaAccounts: undefined,
  hederaMethods: undefined,
  hederaEvents: undefined,
  eip155Accounts: ["eip155:296:0x..."],
  eip155Methods: [...],
  eip155Events: ["accountsChanged", "chainChanged"]
}
```

## Key Differences Between V1 and V2

### V1 (HWC v1):

- **Always uses** `requiredNamespaces` with `hedera` namespace
- **Namespace**: Always `hedera:testnet` or `hedera:mainnet`
- **Account format**: `hedera:testnet:0.0.12345`
- **Methods**: Native Hedera methods (hedera\_\*)
- **HashPack Support**: ✅ Full support

### V2 (HWC v2 with Reown AppKit):

- **Can use** either `requiredNamespaces` or `optionalNamespaces` based on `namespaceMode`
- **Namespace**: Can be `hedera`, `eip155`, or both
- **Account format**:
  - Hedera: `hedera:testnet:0.0.12345`
  - EIP-155: `eip155:296:0x...`
- **Methods**:
  - Hedera namespace: Native Hedera methods
  - EIP-155 namespace: Ethereum JSON-RPC methods
- **HashPack Support**:
  - ❌ `hedera` namespace not supported
  - ✅ `eip155` namespace supported

## What This Reveals

The logging clearly shows:

1. **V1 always requests `hedera` namespace** and HashPack responds correctly
2. **V2 can request `hedera` namespace** but HashPack ignores it and only responds with `eip155`
3. **The `namespaceMode: 'required'`** parameter correctly changes from `optionalNamespaces` to
   `requiredNamespaces`
4. **HashPack's limitation** is in their wallet implementation, not in the library

## Testing

To see the logs:

1. Open browser developer console
2. Connect with HWC v1 - observe the `hedera` namespace in use
3. Disconnect
4. Connect with HWC v2 selecting "Hedera (Native)" - observe the error or eip155 fallback
5. Connect with HWC v2 selecting "EIP-155" - observe successful connection with eip155 namespace

The logs will clearly show the payload differences and help understand why HashPack behaves
differently with v1 vs v2.
