export function toEvmAddress(accountId: string): string {
  if (!accountId) {
    return ''
  }
  if (accountId.startsWith('0x')) {
    return accountId.toLowerCase()
  }
  const parts = accountId.split('.')
  if (parts.length !== 3) {
    return accountId
  }
  try {
    const [shard, realm, num] = parts.map((p) => BigInt(p))
    const big = (shard << 96n) | (realm << 32n) | num
    return '0x' + big.toString(16).padStart(40, '0')
  } catch {
    return accountId
  }
}
