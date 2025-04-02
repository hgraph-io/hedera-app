# Hedera App

This is an example Hedera app that integrates Hedera using either the native Hedera gRPC
endpoints as well as Ethereum JSON-RPC endpoints. This wallet is designed to be used with the
Reown AppKit. For an example wallet see <https://github.com/hgraph-io/hedera-wallet>.

## Getting started

1. Fill out the .env file with a <https://cloud.reown.com> project id and Hedera rpc endpoints:
   <https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay>.

```sh
## copy and then update the .env file
cp .env.example .env
```

2. Install dependencies

```sh
npm install
```

3. Run the app

```sh
npm run dev
```

## EVM vs Hedera native transactions

Hedera acheives EVM compatibility by implementing the Ethereum JSON-RPC spec through a middle
layer called a JSON-RPC relay. This relay is responsible for translating EVM transactions into
Hedera native transactions. To see a full list of supported methods, refer to
<https://github.com/hashgraph/hedera-json-rpc-relay/blob/main/docs/rpc-api.md>

Both wallets and apps that integrate Hedera can choose to use either the EVM compatibility layer
or interact directly with Hedera APIs through the SDKs or implement both. A strong reason to
integrate Hedera via the EVM compatibility is to leverage existing tooling and libraries
available in the EVM ecosystem.

> [!WARNING] If using the EVM namespace as defined by
> [viem](https://github.com/wevm/viem/tree/main/src/chains/definitions) and importable via
> `import {hedera, hederaTestnet}from '@reown/appkit/networks'` Ed25519 based accounts are not
> supported. For more information see
> <https://docs.hedera.com/hedera/core-concepts/keys-and-signatures>.

A strong reason to integrate Hedera via the native APIs is to fully support all account types
and native transaction types provided by Hedera. Integrating both approaches allows for the
broadest compatibility amongst, dApps, wallets, and users.

In the context of Reown's WalletKit and AppKit, this is defined by the namespaces requested by
apps to wallets. For the EVM compatibility layer, the namespace is `eip155` and for Hedera
native transactions it is `hedera`.
