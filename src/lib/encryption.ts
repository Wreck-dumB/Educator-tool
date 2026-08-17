import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Application-layer encryption for a small set of highly sensitive columns
// (child medical/behavioural notes, staff WWCC numbers) that are otherwise
// protected only by Supabase RLS. The key lives solely in server env — never
// in Supabase — so a leaked service-role key or a raw DB dump alone cannot
// decrypt these fields; both the key AND DB access are required.
//
// Deliberately NOT a schema migration: existing plaintext rows keep working
// unchanged (decryptField recognises and passes through un-prefixed values),
// so there's no destructive backfill required to ship this. Rows get
// encrypted the next time they're saved. See NEXT.md for the optional
// backfill-on-demand follow-up.

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

/**
 * Encrypts a plaintext string for at-rest storage. Server-only.
 *
 * If FIELD_ENCRYPTION_KEY isn't configured, this logs a warning and returns
 * the plaintext unchanged rather than throwing — every one of these fields
 * is plaintext today, so a missing key just means "not yet encrypted," the
 * same as the status quo, rather than breaking the save of a health plan,
 * child profile, or compliance record in production.
 */
export function encryptField(plaintext: string): string;
export function encryptField(plaintext: string | null): string | null;
export function encryptField(plaintext: string | null): string | null {
  if (plaintext === null || plaintext === "") return plaintext;
  let key: Buffer;
  try {
    key = getKey();
  } catch (err) {
    console.error("Field encryption skipped — storing as plaintext", err);
    return plaintext;
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypts a value written by encryptField(). Values that don't carry the
 * "enc:v1:" prefix are legacy plaintext (written before this system existed,
 * or a row nothing has re-saved yet) and are returned unchanged — never
 * thrown on. A decrypt failure (wrong/rotated key, corrupted data) also
 * falls back to returning the raw stored value rather than throwing, so a
 * misconfiguration never makes an emergency medical plan unreadable — worst
 * case it displays ciphertext instead of blocking the page.
 */
export function decryptField(stored: string | null): string | null {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  try {
    const key = getKey();
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (err) {
    console.error("Field decryption failed — returning raw stored value", err);
    return stored;
  }
}
