/**
 * Calculates SHA-256 hash of a string using Web Crypto API.
 * @param str Input string
 * @returns Hex string of the hash
 */
export async function calculateHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
