import crypto from 'crypto';

// Get key from environment, or use a default static key for development
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.DB_ENCRYPTION_KEY, 'salt-salt-salt', 32)
  : crypto.scryptSync('cuap-wccms-aes-key-2026', 'salt-salt-salt', 32);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export const encrypt = (text: string): string => {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:encrypted_text:auth_tag
    return `${iv.toString('hex')}:${encrypted}:${tag}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  
  // If the text does not match the encrypted format (separated by colons), return as is
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // Return original cipher if decryption fails (e.g. database migration or unencrypted records)
    return encryptedText;
  }
};
