# Hedera App

This is an example app that integrates Hedera using both the native Hedera gRPC and REST APIs as
well as Ethereum JSON-RPC compatible endpoints. This app utilizes
[Reown AppKit](https://docs.reown.com/appkit/overview). For an example Hedera wallet
implementation see <https://github.com/hgraph-io/hedera-wallet>.

> [!NOTE]
>
> Hedera consensus nodes provide gRPC APIs to change network state such as submitting as
> transferring cryptocurrency or smart contract calls that change network state.
>
> Hedera mirror nodes provide REST APIs to query read-only network state such as account
> balances and transaction history.
>
> - [Consensus Nodes](https://docs.hedera.com/hedera/networks/mainnet/mainnet-nodes)
> - [Mirror Nodes](https://docs.hedera.com/hedera/core-concepts/mirror-nodes)
> - [Hedera JSON-RPC Relay](https://github.com/hashgraph/hedera-json-rpc-relay/blob/main/docs/rpc-api.md)

## Getting started

1. Fill out the .env file with a [Reown](https://cloud.reown.com) project id.

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

## Key considerations when integrating Hedera

The Hedera network provides gRPC and REST APIs that are consumed by Hedera SDKs and network
users.

Hedera supports the Ethereum JSON-RPC spec through a middle layer called the Hedera JSON-RPC
Relay. This relay is responsible for translating Ethereum JSON-RPC compatible API calls into
Hedera gRPC and REST API calls. To see a full list of supported methods, refer to the JSON-RPC
Relay documentation linked in the note above.

Apps and wallets that integrate Hedera can choose to use the Hedera JSON-RPC Relay to interact
with the network, directly use Hedera APIs and SDKs, or do both. A strong reason to leverage the
Hedera JSON-RPC Relay is to utilize existing tools and libraries available in the EVM ecosystem
such as Wagmi, Viem, AppKit, and WalletKit.

> [!WARNING]
>
> When using the EVM namespace, Hedera accounts that have Ed25519 public/private key pairs are
> not supported. See the docs for more information.
>
> - [Reown: Custom networks](https://docs.reown.com/appkit/react/core/custom-networks#1-adding-your-chain-to-viem%E2%80%99s-directory-recommended)
> - [Hedera: Ed25519 vs ECDSA](https://docs.hedera.com/hedera/core-concepts/keys-and-signatures#choosing-between-ecdsa-and-ed25519-keys).

A strong reason to integrate Hedera via the native APIs is to fully support all account types
and native transaction types provided by Hedera.

In the context of Reown's WalletKit and AppKit, this is defined by the namespaces requested by
apps to wallets. The namespace is `eip155` for the EVM compatibility layer and `hedera` for
native integration.

## Agent setup

The repository includes a helper script to prepare a local environment. Run the following command after cloning the project:

```sh
./agent-setup.sh
```

This script installs npm dependencies, copies the `.env` template if needed, lints the code and builds the project.

## Running tests with coverage

To generate a coverage report, run:

```sh
npm run coverage
```

The report will be saved in the `coverage` directory and a summary will be printed in the console.

## Docker

This project includes a `Dockerfile` so you can run the app in a container without installing Node.js locally.

1. Build the image

```sh
docker build -t hedera-app .
```

2. Run the container with your project ID

```sh
docker run --rm -p 5173:5173 -e VITE_REOWN_PROJECT_ID=<your_project_id> hedera-app
```

The app will be available at <http://localhost:5173>.
