import {
  useDisconnect,
  useAppKit,
  useAppKitNetwork,
  useAppKitAccount,
  useAppKitNetworkCore,
  useAppKitState,
} from "@reown/appkit/react";
import {
  BrowserProvider,
  JsonRpcSigner,
  formatEther,
  parseEther,
} from "ethers";
import {
  hederaTestnetNative as hederaNativeTestnet,
  transactionToBase64String,
  WalletConnectProvider,
} from "../lib/adapters/hedera";
import { hederaTestnet as hederaTestnetEvm } from "@reown/appkit/networks";
import { useState } from "react";
import { ChainNamespace } from "@reown/appkit-common";
import {
  AccountInfo,
  AccountInfoQuery,
  Hbar,
  Transaction,
  TransactionId,
  TransferTransaction,
} from "@hashgraph/sdk";
import {
  queryToBase64String,
  SignAndExecuteQueryParams,
  SignMessageParams,
} from "@hashgraph/hedera-wallet-connect";
import { universalHederaAdapter } from "../config";

const testEthReceiver = "0xE53F9824319B891CD4D6050dBF2b242Be7e13344";
const testNativeReceiver = "0.0.4848542";

interface ActionButtonListProps {
  sendHash: (hash: string) => void;
  sendTxId: (id: string) => void;
  sendSignMsg: (hash: string) => void;
  sendBalance: (balance: string) => void;

  sendNodeAddresses: (nodes: string[]) => void;
}

export const ActionButtonList = ({
  sendHash,
  sendTxId,
  sendSignMsg,
  sendBalance,
  sendNodeAddresses,
}: ActionButtonListProps) => {
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { chainId } = useAppKitNetworkCore();
  const { isConnected, address } = useAppKitAccount();
  const { switchNetwork } = useAppKitNetwork();
  const { activeChain } = useAppKitState();
  const [signedHederaTx, setSignedHederaTx] = useState<Transaction>();

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  // --- HIP-820 ---

  const getwalletProvider = () => {
    if (!universalHederaAdapter || !address)
      throw Error("user is disconnected");
    return universalHederaAdapter.walletConnectProvider as WalletConnectProvider;
  };
  const hedera_getNodeAddresses = async () => {
    const walletProvider = getwalletProvider();
    const result = await walletProvider.hedera_getNodeAddresses();
    sendNodeAddresses(result.nodes);
  };

  const hedera_executeTransaction = async () => {
    const walletProvider = getwalletProvider();
    if (!signedHederaTx) {
      throw Error("Transaction not signed, use hedera_signTransaction first");
    }

    const transactionList = transactionToBase64String(signedHederaTx);

    const result = await walletProvider.hedera_executeTransaction({
      transactionList,
    });
    setSignedHederaTx(undefined);
    sendTxId(result.transactionId);
  };

  const hedera_signMessage = async () => {
    const walletProvider = getwalletProvider();

    const params: SignMessageParams = {
      signerAccountId:
        "hedera:testnet:" + walletProvider.getAccountAddresses()[0],
      message: "Test Message for AppKit Example",
    };

    const { signatureMap } = await walletProvider.hedera_signMessage(params);

    sendSignMsg(signatureMap);
  };

  const hedera_signTransaction = async () => {
    const walletProvider = getwalletProvider();

    const accountId = walletProvider.getAccountAddresses()[0];
    const hbarAmount = new Hbar(Number(1));
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId!))
      .setMaxTransactionFee(new Hbar(Number(1)))
      .addHbarTransfer(accountId.toString()!, hbarAmount.negated())
      .addHbarTransfer(testNativeReceiver, hbarAmount);

    const transactionSigned = await walletProvider.hedera_signTransaction({
      signerAccountId:
        "hedera:testnet:" + walletProvider.getAccountAddresses()[0],
      transactionBody: transaction,
    });
    window.alert(
      "transactionSigned: " +
        JSON.stringify((transactionSigned as Transaction).getSignatures()),
    );
    setSignedHederaTx(transactionSigned as Transaction);
  };

  const hedera_signAndExecuteQuery = async () => {
    const walletProvider = getwalletProvider();
    const accountId = walletProvider.getAccountAddresses()[0];
    const query = new AccountInfoQuery().setAccountId(accountId);

    const params: SignAndExecuteQueryParams = {
      signerAccountId: "hedera:testnet:" + accountId.toString(),
      query: queryToBase64String(query),
    };

    const result = await walletProvider.hedera_signAndExecuteQuery(params);
    const bytes = Buffer.from(result.response, "base64");
    const accountInfo = AccountInfo.fromBytes(bytes);
    window.alert(
      "hedera_signAndExecuteQuery result: " + JSON.stringify(accountInfo),
    );
  };
  const hedera_signAndExecuteTransaction = async () => {
    const walletProvider = getwalletProvider();

    const accountId = walletProvider.getAccountAddresses()[0];
    const hbarAmount = new Hbar(Number(1));
    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(accountId!))
      .addHbarTransfer(accountId.toString()!, hbarAmount.negated())
      .addHbarTransfer(testNativeReceiver, hbarAmount);

    const result = await walletProvider.hedera_signAndExecuteTransaction({
      signerAccountId:
        "hedera:testnet:" + walletProvider.getAccountAddresses()[0],
      transactionList: transactionToBase64String(transaction),
    });

    sendTxId(result.transactionId);
  };
  // --- EIP-155 ---

  // function to send a tx
  const eth_sendTransaction = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");

    const provider = new BrowserProvider(walletProvider, chainId);
    const signer = new JsonRpcSigner(provider, address);

    const tx = await signer.sendTransaction({
      to: testEthReceiver,
      value: parseEther("1"), // 1 Hbar
      gasLimit: 1_000_000,
    });

    sendHash(tx.hash);
  };

  // function to sing a msg
  const eth_signMessage = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");

    const provider = new BrowserProvider(walletProvider, chainId);
    const signer = new JsonRpcSigner(provider, address);
    const sig = await signer?.signMessage("Hello Reown AppKit!");

    sendSignMsg(sig);
  };

  // function to get the balance
  const eth_getBalance = async () => {
    const walletProvider = getwalletProvider();
    if (!address) throw Error("user is disconnected");
    const provider = new BrowserProvider(walletProvider, chainId);
    const balance = await provider.getBalance(address);
    const hbar = formatEther(balance);
    sendBalance(`${hbar} HBAR`);
  };
  return (
    <div>
      {isConnected ? (
        <>
          <div>
            <button onClick={() => open()}>Open</button>
            <button onClick={handleDisconnect}>Disconnect</button>
            <button
              onClick={() =>
                switchNetwork(
                  activeChain == "eip155"
                    ? hederaNativeTestnet
                    : hederaTestnetEvm,
                )
              }
            >
              Switch Network
            </button>
          </div>
          {activeChain == "eip155" && (
            <>
              <div>
                <br />
                <strong>EIP-155 Methods:</strong>
              </div>
              <div>
                <button onClick={eth_signMessage}>eth_signMessage</button>
                <button onClick={eth_sendTransaction}>
                  eth_sendTransaction
                </button>
                <button onClick={eth_getBalance}>eth_getBalance</button>
              </div>
            </>
          )}
          {activeChain == ("hedera" as ChainNamespace) && (
            <>
              <div>
                <br />
                <strong>HIP-820 Methods:</strong>
              </div>
              <div>
                <button onClick={hedera_getNodeAddresses}>
                  hedera_getNodeAddresses
                </button>
                <button onClick={hedera_signMessage}>hedera_signMessage</button>
                <button onClick={hedera_signTransaction}>
                  hedera_signTransaction
                </button>
                <button
                  onClick={hedera_executeTransaction}
                  disabled={!signedHederaTx}
                  title="Call hedera_signTransaction first"
                >
                  hedera_executeTransaction
                </button>
                <button onClick={hedera_signAndExecuteQuery}>
                  hedera_signAndExecuteQuery
                </button>
                <button onClick={hedera_signAndExecuteTransaction}>
                  hedera_signAndExecuteTransaction
                </button>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
};
