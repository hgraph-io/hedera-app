# Hedera App

This is a simple Hedera wallet meant to demonstrate integration of an EVM based Hedera wallet
and a wallet that supports Hedera native transactions.

## Getting started

1. Fill out the .env file with a <https://cloud.reown.com> project id and Hedera rpc endpoints:
   <https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay>.

```sh
## copy and then update the .env file
cp .env.example .env
```

2. Install dependencies

```sh
yarn install
```

3. Run the app

```sh
yarn dev
```

## EVM vs Hedera native transactions

Hedera acheives EVM compatibility by implementing the Ethereum JSON-RPC spec through a middle
layer called a JSON-RPC relay. This relay is responsible for translating EVM transactions into
Hedera native transactions. While the Hedera JSON-RPC is considered feature complete and ready
for production, please note the delineation between _compatible_ and _equivalent_. To see a full
list of supported methods, refer to
<https://github.com/hashgraph/hedera-json-rpc-relay/blob/main/docs/rpc-api.md>

Both wallets and dApps that integrate Hedera can choose to use either the EVM compatibility
layer or interact directly with Hedera APIs through the SDKs or implement both. A strong reason
to integrate Hedera via the EVM compatibility is to leverage existing tooling and libraries
available in the EVM ecosystem. A strong reason to integrate Hedera via the native APIs is to
fully support all account types and native transaction types provided by Hedera. Integrating
both approaches allows for the broadest compatibility amongst, dApps, wallets, and users.

In the context of Reown's WalletKit and AppKit, this is defined by the namespaces requested by
dApps to wallets. For the EVM compatibility layer, the namespace is `eip155` and for Hedera
native transactions it is `hedera`.
