export const debugWalletState = () => {
  const universalProvider = (window as any).universalProvider
  const appKitState = (window as any).__REOWN_APPKIT_STATE__

  console.group('Wallet Debug Info')
  console.log('Provider Session:', universalProvider?.session)
  console.log('AppKit State:', appKitState)
  console.log(
    'LocalStorage WC Keys:',
    Object.keys(localStorage).filter(
      (k) => k.includes('wallet') || k.includes('wc') || k.includes('WC'),
    ),
  )
  console.groupEnd()
}

// Make it globally available
if (typeof window !== 'undefined') {
  ;(window as any).debugWallet = debugWalletState
}
