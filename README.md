# Hedera App

This is an example app that integrates Hedera using both the native Hedera gRPC APIs as
well as Ethereum JSON-RPC compatible endpoints. This app utilizes
[Reown AppKit](https://docs.reown.com/appkit/overview). For an example Hedera wallet
implementation see <https://github.com/hgraph-io/hedera-wallet>.

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

## Key considerations for integrating Hedera

The Hedera network provides gRPC and REST APIs that are consumed by Hedera SDKs and network
users.

Hedera supports the Ethereum JSON-RPC spec through a middle layer called the Hedera JSON-RPC
Relay. This relay is responsible for translating Ethereum JSON-RPC API calls into Hedera gRPC
API calls. To see a full list of supported methods, refer to
<https://github.com/hashgraph/hedera-json-rpc-relay/blob/main/docs/rpc-api.md>

Apps and wallets that integrate Hedera can choose to use the Hedera JSON-RPC Relay to interact
with the network, directly use Hedera APIs and SDKs, or do both. A strong reason to integrate
Hedera leveraging the Hedera JSON-RPC Relay is to utilize existing tools and libraries available
in the EVM ecosystem such as Wagmi, Viem, AppKit, and WalletKit.

> [!WARNING]
>
> When using the EVM namespace Hedera accounts that have Ed25519 public/private key pairs are
> not supported. See the docs for more information.
>
> - [Reown: Custom networks](https://docs.reown.com/appkit/react/core/custom-networks#1-adding-your-chain-to-viem%E2%80%99s-directory-recommended)
> - [Hedera: Ed25519 vs ECDSA](https://docs.hedera.com/hedera/core-concepts/keys-and-signatures#choosing-between-ecdsa-and-ed25519-keys).

A strong reason to integrate Hedera via the native APIs is to fully support all account types
and native transaction types provided by Hedera. Integrating both approaches allows for the
broadest compatibility amongst, apps, wallets, and users.

In the context of Reown's WalletKit and AppKit, this is defined by the namespaces requested by
apps to wallets. For the EVM compatibility layer, the namespace is `eip155` and for Hedera
native transactions it is `hedera`.
