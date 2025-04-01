/**
 * Cryptography utility using Web Crypto API for secure token encryption/decryption
 */

// Constants
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ENCODING = 'utf-8';

// Generate a secure encryption key based on environment secret
async function getEncryptionKey(): Promise<CryptoKey> {
  // In production, ENCRYPTION_KEY must be set
  const isDev = process.env.NODE_ENV !== 'production';
  const secretBase = process.env.ENCRYPTION_KEY;

  if (!secretBase) {
    if (!isDev) {
      throw new Error('ENCRYPTION_KEY environment variable is not set in production environment');
    }

    console.warn('⚠️ WARNING: Using default encryption key. This is not secure for production!');
    // Only use default in development
    const devDefault = 'default-secret-change-in-production-env-not-secure';
    return generateKeyFromSecret(devDefault);
  }

  return generateKeyFromSecret(secretBase);
}

// Helper function to generate key from a string secret
async function generateKeyFromSecret(secret: string): Promise<CryptoKey> {
  // Convert the string to an ArrayBuffer
  const encoder = new TextEncoder();
  const secretData = encoder.encode(secret);

  // Create a key using the secret
  const keyMaterial = await crypto.subtle.digest('SHA-256', secretData);

  // Import the key for AES-GCM
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // Not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string value using AES-GCM
 */
export async function encrypt(value: string): Promise<string> {
  if (!value) return '';

  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(value);

  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, data);

  // Combine IV and encrypted data for storage
  const result = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
  result.set(iv);
  result.set(new Uint8Array(encryptedData), iv.length);

  // Convert to base64 for storage in cookie
  return btoa(String.fromCharCode(...result));
}

/**
 * Decrypts an encrypted string value
 */
export async function decrypt(encryptedValue: string): Promise<string> {
  if (!encryptedValue) return '';

  try {
    const key = await getEncryptionKey();

    // Convert from base64
    const encryptedBytes = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and encrypted data
    const iv = encryptedBytes.slice(0, 12);
    const data = encryptedBytes.slice(12);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);

    // Convert back to string
    const decoder = new TextDecoder(ENCODING);
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}
