import { useEffect, useState } from "react";
import {
  useAppKitState,
  useAppKitTheme,
  useAppKitEvents,
  useAppKitAccount,
  useWalletInfo,
  useAppKitProvider,
  useAppKitNetworkCore,
  type Provider,
} from "@reown/appkit/react";
import { BrowserProvider } from "ethers";

interface InfoListProps {
  hash: string;
  signedMsg: string;
  balance: string;

  nodes: string[];
}

export const InfoList = ({
  hash,
  signedMsg,
  balance,
  nodes,
}: InfoListProps) => {
  const [statusTx, setStatusTx] = useState("");

  const { themeMode, themeVariables } = useAppKitTheme();
  const state = useAppKitState();
  const { chainId } = useAppKitNetworkCore();
  const { address, caipAddress, isConnected, status } = useAppKitAccount();
  const events = useAppKitEvents();
  const walletInfo = useWalletInfo();
  const { walletProvider: EIP155Provider } =
    useAppKitProvider<Provider>("eip155");

  useEffect(() => {
    console.log("Events: ", events);
  }, [events]);

  useEffect(() => {
    const checkTransactionStatus = async () => {
      if (hash && EIP155Provider && state.activeChain == "eip155") {
        try {
          const provider = new BrowserProvider(EIP155Provider, chainId);
          const receipt = await provider.getTransactionReceipt(hash);
          setStatusTx(
            receipt?.status === 1
              ? "Success"
              : receipt?.status === 0
                ? "Failed"
                : "Pending",
          );
        } catch (err) {
          console.error("Error checking transaction status:", err);
          setStatusTx("Error");
        }
      }
    };

    checkTransactionStatus();
  }, [hash, EIP155Provider, chainId, state.activeChain]);

  return (
    <>
      {balance && (
        <section>
          <h2>Balance: {balance}</h2>
        </section>
      )}
      {hash && (
        <section>
          <h2>Sign Tx</h2>
          <pre>
            Hash: {hash}
            <br />
            Status: {statusTx}
            <br />
          </pre>
        </section>
      )}
      {signedMsg && (
        <section>
          <h2>Signature of message</h2>
          <pre>
            {signedMsg}
            <br />
          </pre>
        </section>
      )}
      <section>
        <h2>useAppKit</h2>
        <pre>
          Address: {address}
          <br />
          caip Address: {caipAddress}
          <br />
          Connected: {isConnected.toString()}
          <br />
          Status: {status}
          <br />
        </pre>
      </section>

      <section>
        <h2>Theme</h2>
        <pre>
          Theme: {themeMode}
          <br />
          ThemeVariables: {JSON.stringify(themeVariables, null, 2)}
          <br />
        </pre>
      </section>

      <section>
        <h2>State</h2>
        <pre>
          activeChain: {state.activeChain}
          <br />
          loading: {state.loading.toString()}
          <br />
          open: {state.open.toString()}
          <br />
          selectedNetworkId: {state.selectedNetworkId?.toString()}
          <br />
        </pre>
      </section>

      <section>
        <h2>WalletInfo</h2>
        <pre>
          Name: {walletInfo.walletInfo?.name?.toString()}
          <br />
        </pre>
      </section>

      {nodes.length > 0 && (
        <section>
          <h2>Nodes</h2>
          {nodes.map((node) => (
            <pre key={node}>
              {node}
              <br />
            </pre>
          ))}
        </section>
      )}
    </>
  );
};
