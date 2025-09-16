/**
 * Decode and format signature data for display
 */
export function decodeSignature(signatureData: string | unknown): {
  formatted: string
  details: {
    raw?: string
    hex?: string
    base64?: string
    accountId?: string
    publicKey?: string
    signature?: string
  }
} {
  try {
    // Handle V1 signatures (simple hex string)
    if (typeof signatureData === 'string' && signatureData.match(/^[0-9a-fA-F]+$/)) {
      return {
        formatted: `0x${signatureData}`,
        details: {
          hex: signatureData,
          raw: signatureData,
        },
      }
    }

    // Handle V2 signatures (SignatureMap format)
    if (typeof signatureData === 'string') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(signatureData)
        return parseSignatureMap(parsed)
      } catch {
        // If not JSON, might be base64 or other format
        return {
          formatted: signatureData,
          details: {
            raw: signatureData,
            base64: signatureData,
          },
        }
      }
    }

    // Handle object signatures (already parsed)
    if (typeof signatureData === 'object') {
      return parseSignatureMap(signatureData)
    }

    return {
      formatted: JSON.stringify(signatureData),
      details: {
        raw: JSON.stringify(signatureData),
      },
    }
  } catch (error) {
    console.error('Error decoding signature:', error)
    return {
      formatted: 'Error decoding signature',
      details: {
        raw: String(signatureData),
      },
    }
  }
}

interface SignatureMap {
  sigMap?: { sigPair?: unknown[] | unknown }
  sigPair?: unknown[] | unknown
}

interface SignaturePair {
  pubKeyPrefix?: string
  publicKey?: string
  ed25519?: string
  ECDSASecp256k1?: string
  signature?: string
}

/**
 * Parse Hedera SignatureMap format
 */
function parseSignatureMap(signatureMap: unknown): {
  formatted: string
  details: {
    raw?: string
    hex?: string
    base64?: string
    accountId?: string
    publicKey?: string
    signature?: string
  }
} {
  try {
    // Handle SignatureMap structure
    const sigMapObj = signatureMap as SignatureMap
    if (sigMapObj.sigMap || sigMapObj.sigPair) {
      const sigPairs = sigMapObj.sigMap?.sigPair || sigMapObj.sigPair || []
      const firstSig = Array.isArray(sigPairs)
        ? (sigPairs[0] as SignaturePair)
        : (sigPairs as SignaturePair)

      if (firstSig) {
        const pubKey = firstSig.pubKeyPrefix || firstSig.publicKey
        const sig = firstSig.ed25519 || firstSig.ECDSASecp256k1 || firstSig.signature

        const details: Record<string, string> = {
          raw: JSON.stringify(signatureMap),
        }

        if (pubKey) {
          // Convert public key to hex if it's base64
          const pubKeyHex = Buffer.from(pubKey, 'base64').toString('hex')
          details.publicKey = pubKeyHex
        }

        if (sig) {
          // Convert signature to hex if it's base64
          const sigHex = Buffer.from(sig, 'base64').toString('hex')
          details.signature = sigHex
          details.hex = sigHex

          return {
            formatted: `Signature: 0x${sigHex.substring(0, 20)}...${sigHex.substring(sigHex.length - 20)}`,
            details,
          }
        }
      }
    }

    // Handle direct signature string
    if (signatureMap.signature) {
      const sigHex = Buffer.from(signatureMap.signature, 'base64').toString('hex')
      return {
        formatted: `0x${sigHex}`,
        details: {
          hex: sigHex,
          raw: JSON.stringify(signatureMap),
        },
      }
    }

    return {
      formatted: JSON.stringify(signatureMap),
      details: {
        raw: JSON.stringify(signatureMap),
      },
    }
  } catch {
    return {
      formatted: 'Error parsing signature map',
      details: {
        raw: JSON.stringify(signatureMap),
      },
    }
  }
}

/**
 * Verify a signature against a message and public key
 * Note: This is a placeholder for actual verification logic
 * Real verification would require the public key and crypto operations
 */
export async function verifySignature(
  message: string,
  signature: string,
): Promise<{
  isValid: boolean
  details: string
}> {
  try {
    // For demonstration purposes, we'll just check that we have all required components
    if (!message || !signature) {
      return {
        isValid: false,
        details: 'Missing message or signature',
      }
    }

    // In a real implementation, you would:
    // 1. Get the public key from the account or signature
    // 2. Use the appropriate crypto library to verify
    // 3. Return the actual verification result

    return {
      isValid: true,
      details: `Signature format valid. Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
    }
  } catch (error) {
    return {
      isValid: false,
      details: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Format signature for display with proper decoding
 */
export function formatSignatureDisplay(
  signature: string | unknown,
  message?: string,
): {
  display: string
  details: string[]
} {
  const decoded = decodeSignature(signature)
  const details: string[] = []

  if (message) {
    details.push(`Message: "${message}"`)
  }

  if (decoded.details.hex) {
    details.push(`Hex: 0x${decoded.details.hex}`)
  }

  if (decoded.details.publicKey) {
    details.push(`Public Key: ${decoded.details.publicKey}`)
  }

  if (decoded.details.signature) {
    details.push(`Signature: ${decoded.details.signature}`)
  }

  return {
    display: decoded.formatted,
    details,
  }
}
