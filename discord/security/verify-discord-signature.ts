export interface DiscordSignatureInput {
  publicKey?: string;
  signature?: string | string[];
  timestamp?: string | string[];
  body: string;
}

export async function verifyDiscordSignature(input: DiscordSignatureInput): Promise<boolean> {
  if (!input.publicKey || !input.signature || !input.timestamp || !input.body) {
    return false;
  }

  // Phase 9 stub: keep the bridge closed until real Ed25519 validation is wired.
  // Use a vetted Discord signature library or WebCrypto Ed25519 import before live exposure.
  return false;
}
