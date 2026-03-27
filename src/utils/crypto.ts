/**
 * Simple AES-GCM encryption utility using Web Crypto API.
 */

const SALT = "dev-voice-reborn-salt"; // Fixed salt for multi-device sync with same password

async function deriveKey(password: string) {
  const encoder = new TextEncoder();
  const saltBuffer = encoder.encode(SALT);
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string, password?: string): Promise<string> {
  if (!password || !text) return text;

  try {
    const key = await deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedText
    );

    const encryptedArray = new Uint8Array(encryptedContent);
    const result = new Uint8Array(iv.length + encryptedArray.length);
    result.set(iv);
    result.set(encryptedArray, iv.length);

    return btoa(String.fromCharCode(...result));
  } catch (e) {
    console.error("[Crypto] Encryption failed:", e);
    return text;
  }
}

export async function decryptText(encryptedBase64: string, password?: string): Promise<string> {
  if (!password || !encryptedBase64) return encryptedBase64;

  try {
    const key = await deriveKey(password);
    const binary = atob(encryptedBase64);
    const result = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      result[i] = binary.charCodeAt(i);
    }

    const iv = result.slice(0, 12);
    const encryptedData = result.slice(12);

    const decryptedContent = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    console.warn("[Crypto] Decryption failed. Password might be wrong or data is not encrypted.");
    return encryptedBase64;
  }
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
}

export async function signData(data: string, privateKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    encoder.encode(data)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(data: string, signatureBase64: string, publicKey: CryptoKey): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const binarySignature = atob(signatureBase64);
    const signature = new Uint8Array(binarySignature.length);
    for (let i = 0; i < binarySignature.length; i++) {
      signature[i] = binarySignature.charCodeAt(i);
    }

    return await crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKey,
      signature,
      encoder.encode(data)
    );
  } catch (e) {
    console.error("[Crypto] Verification failed:", e);
    return false;
  }
}
