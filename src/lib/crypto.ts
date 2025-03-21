import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Function to get or generate a consistent encryption key
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // If env key is provided, hash it to ensure correct length
    return createHash('sha256').update(String(envKey)).digest();
  }
  // Generate a static key if not provided
  return createHash('sha256').update('default-key-do-not-use-in-production').digest();
}

const ENCRYPTION_KEY = getEncryptionKey();

export async function encrypt(text: string): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  const result = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  return result;
}

export async function decrypt(text: string): Promise<string> {
  try {
    const [ivHex, encryptedHex] = text.split(':');

    if (!ivHex || !encryptedHex) {
      console.error('[Crypto] Invalid encrypted text format');
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('[Crypto] Error decrypting text:', error);
    throw error;
  }
}
