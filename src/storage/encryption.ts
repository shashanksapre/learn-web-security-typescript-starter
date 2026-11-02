import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedPayload = {
  nonce: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
};

function validateKey(key: Buffer): void {
  if (!Buffer.isBuffer(key)) {
    throw new Error("key is not a buffer");
  }

  if (key.length != 32) {
    throw new Error("key length is not a 32");
  }
}

function validatePayload(payload: EncryptedPayload): void {
  if (!Buffer.isBuffer(payload.nonce)) {
    throw new Error("nonce is not a buffer");
  }

  if (payload.nonce.length != 12) {
    throw new Error("nonce length is not a 12");
  }

  if (!Buffer.isBuffer(payload.authTag)) {
    throw new Error("authTag is not a buffer");
  }

  if (payload.authTag.length != 16) {
    throw new Error("authTag length is not a 16");
  }

  if (!Buffer.isBuffer(payload.ciphertext)) {
    throw new Error("ciphertext is not a buffer");
  }
}

function encrypt(plaintext: Buffer, key: Buffer): EncryptedPayload {
  validateKey(key);
  const nonce = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, nonce, {
    authTagLength: 16,
  });

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { nonce, authTag, ciphertext };
}

function decrypt(payload: EncryptedPayload, key: Buffer): Buffer {
  validateKey(key);
  validatePayload(payload);

  const decipher = createDecipheriv("aes-256-gcm", key, payload.nonce, {
    authTagLength: 16,
  });

  decipher.setAuthTag(payload.authTag);

  const plaintext = Buffer.concat([
    decipher.update(payload.ciphertext),
    decipher.final(),
  ]);

  return plaintext;
}

export { encrypt, decrypt };
export { type EncryptedPayload };
