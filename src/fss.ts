import { CredentialStorage } from "@tempojs/client";
import {
  Credential,
  parseCredential,
  stringifyCredential,
} from "@tempojs/common";
import path from "path";
import os from "os";
import fs from "fs";
import crypto from "crypto";

/**
 * Returns the path to the directory where credentials should be stored.
 * @param namespace - The namespace that will be used for the directory.
 * @returns The path to the app data directory.
 * @throws An error if the platform is not supported.
 */
const appDataDir = (namespace: string) => {
  if (process.env["APP_DATA_DIR_OVERRIDE"]) {
    return path.join(process.env["APP_DATA_DIR_OVERRIDE"], namespace);
  }

  let appDataDir: string;
  switch (os.platform()) {
    case "win32":
      appDataDir = process.env["APPDATA"] || path.join(os.homedir(), "AppData", "Local");
      break;
    case "darwin":
      appDataDir = path.join(os.homedir(), "Library", "Application Support");
      break;
    case "linux":
      appDataDir = "/var";
      break;
    default:
      throw new Error("Unsupported platform");
  }
  return path.join(appDataDir, namespace);
};

const algorithm = "aes-256-cbc";

/**
 * Encrypts a credential using the provided encryption key.
 * @param credential - The credential to be encrypted.
 * @param encryptionKey - The encryption key to be used.
 * @returns The encrypted credential.
 */
export const encryptCredential = (
  credential: Credential,
  encryptionKey: string
) => {
  const serialized = stringifyCredential(credential);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  let encrypted = cipher.update(serialized, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};
/**
 * Decrypts an encrypted credential using the provided encryption key.
 * @param encrypted - The encrypted credential to be decrypted.
 * @param encryptionKey - The encryption key to be used.
 * @returns The decrypted credential or undefined if decryption fails.
 * @throws An error if the encrypted string is invalid.
 */
export const decryptCredential = (
  encrypted: string,
  encryptionKey: string
): Credential | undefined => {
  const textParts = encrypted.split(":");
  if (textParts.length < 2) {
    throw new Error("Invalid encrypted string");
  }
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
  const decrypted = decipher.update(encryptedText);
  return parseCredential(
    Buffer.concat([decrypted, decipher.final()]).toString()
  );
};

/**
 * A class that implements the CredentialStorage interface using the file system as storage.
 */
export class FileSystemStorageStrategy implements CredentialStorage {
  /**
   * The path to the directory where credentials should be stored.
   */
  private readonly appDataDir: string;

  /**
   * Creates a new instance of the FileSystemStorageStrategy class.
   * @param namespace - The namespace that will be used for the directory.
   * @param encryptionKey - The encryption key to be used for encrypting and decrypting credentials.
   */
  constructor(namespace: string, private readonly encryptionKey?: string) {
    if (encryptionKey && encryptionKey.length !== 32) {
      throw new Error(
        "Invalid encryption key length. AES-256-CBC requires a 32-byte key."
      );
    }
    this.appDataDir = appDataDir(namespace);
    if (!fs.existsSync(this.appDataDir)) {
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }
  }

  /**
   * Retrieves a credential from storage.
   * @param key - The key used to identify the credential.
   * @returns The credential or undefined if it does not exist.
   */
  public async getCredential(key: string): Promise<Credential | undefined> {
    const credentialPath = path.join(this.appDataDir, key);
    if (!fs.existsSync(credentialPath)) {
      return undefined;
    }
    const file = await fs.promises.readFile(credentialPath, "utf-8");
    return this.encryptionKey
      ? decryptCredential(file, this.encryptionKey)
      : parseCredential(file);
  }

  /**
   * Stores a credential in storage.
   * @param key - The key used to identify the credential.
   * @param credential - The credential to be stored.
   */
  public async storeCredential(
    key: string,
    credential: Credential
  ): Promise<void> {
    const serialized = this.encryptionKey
      ? encryptCredential(credential, this.encryptionKey)
      : stringifyCredential(credential);

    await fs.promises.writeFile(
      path.join(this.appDataDir, key),
      serialized,
      "utf-8"
    );
  }

  /**
   * Removes a credential from storage.
   * @param key - The key used to identify the credential.
   */
  public async removeCredential(key: string): Promise<void> {
    const credentialPath = path.join(this.appDataDir, key);
    if (fs.existsSync(credentialPath)) {
      await fs.promises.unlink(credentialPath);
    }
  }
}
