import { AppKitNetwork } from '@reown/appkit/networks'

import {
  hederaMainnetNative,
  hederaTestnetNative,
  hederaMainnetEvm,
  hederaTestnetEvm,
  HederaWalletConnectProvider,
} from '../lib/adapters/hedera'
import { HederaAdapter } from '../lib/adapters/hedera/adapter'
import { ChainNamespace } from '@reown/appkit-common'

export const hederaNamespace = 'hedera' as ChainNamespace

// Get projectId from https://cloud.reown.com
export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const metadata = {
  name: 'Hedera EIP155 & HIP820 Example',
  description: 'Hedera EIP155 & HIP820 Example',
  url: 'https://github.com/hashgraph/hedera-wallet-connect/',
  icons: ['https://avatars.githubusercontent.com/u/31002956'],
}

export const networks = [
  hederaMainnetEvm,
  hederaTestnetEvm,
  hederaMainnetNative,
  hederaTestnetNative,
] as [AppKitNetwork, ...AppKitNetwork[]]

export const nativeHederaAdapter = new HederaAdapter({
  projectId,
  networks: [hederaMainnetNative, hederaTestnetNative],
  namespace: hederaNamespace,
})

export const eip155HederaAdapter = new HederaAdapter({
  projectId,
  networks: [hederaMainnetEvm, hederaTestnetEvm],
  namespace: 'eip155',
})

export const universalProvider = await HederaWalletConnectProvider.init({
  projectId,
  metadata,
  logger: 'debug',
})
