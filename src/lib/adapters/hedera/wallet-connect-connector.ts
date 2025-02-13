import { WalletConnectConnector } from '@reown/appkit/connectors'
import type { SessionTypes } from '@walletconnect/types'
import { createNamespaces } from './utils'
import { ChainNamespace } from '@reown/appkit-common'
export class HederaWalletConnectConnector extends WalletConnectConnector<ChainNamespace> {
  public readonly imageUrl = '/hedera.svg'

  async connectWalletConnect() {
    const isAuthenticated = await this.authenticate()

    if (!isAuthenticated) {
      await this.provider.connect({
        optionalNamespaces: createNamespaces(this.caipNetworks),
      })
    }

    return {
      clientId: await this.provider.client.core.crypto.getClientId(),
      session: this.provider.session as SessionTypes.Struct,
    }
  }
}
