import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileSystemStorageStrategy } from "./index";
import { Credential, stringifyCredential } from "@tempojs/common";
import mockFs from "mock-fs";
import {
  decryptCredential,
  encryptCredential,
} from "./fss";

const testCredential: Credential = { id: "1", token: "test-token" };
const encryptionKey = "12345678901234567890123456789012";

describe("encryption", () => {
  it("should encrypt credential", () => {
    const encrypted = encryptCredential(testCredential, encryptionKey);
    expect(encrypted).not.toEqual(stringifyCredential(testCredential));
  });
  it("should decrypt encrypted credential", () => {
    const encrypted = encryptCredential(testCredential, encryptionKey);
    const decrypted = decryptCredential(encrypted, encryptionKey);
    expect(decrypted).toEqual(testCredential);
  });
  it("should throw error if encrypted string is invalid", () => {
    expect(() => decryptCredential("invalid", encryptionKey)).toThrow();
  });
});

describe("FileSystemStorageStrategy", () => {
  beforeEach(() => {
    process.env = Object.assign(process.env, { APP_DATA_DIR_OVERRIDE: "/var" });
    // Set up mock file system
    mockFs({
      "/var/namespace": {
        "credential-encrypted.json": encryptCredential(
          testCredential,
          encryptionKey
        ),
      },
    });
  });

  afterEach(() => {
    // Restore the file system after each test
    mockFs.restore();
  });

  it("should retrieve credential from storage", async () => {
    const storage = new FileSystemStorageStrategy("namespace", encryptionKey);
    const credential = await storage.getCredential("credential-encrypted.json");
    expect(credential).toEqual(testCredential);
  });

  it("should store and retrieve credential in storage", async () => {
    const storage = new FileSystemStorageStrategy("namespace", encryptionKey);
    await storage.storeCredential("credential-encrypted.json", testCredential);
    const storedCredential = await storage.getCredential(
      "credential-encrypted.json"
    );
    expect(storedCredential).toEqual(testCredential);
  });

  it("should remove credential from storage", async () => {
    const storage = new FileSystemStorageStrategy("namespace", encryptionKey);
    await storage.removeCredential("credential-encrypted.json");
    const credential = await storage.getCredential("credential-encrypted.json");
    expect(credential).toBeUndefined();
  });
});

describe("FileSystemStorageStrategy without encryption", () => {
  beforeEach(() => {
    // Set up mock file system
    mockFs({
      "/var/namespace": {
        "credential.json": JSON.stringify(testCredential),
      },
    });
  });

  afterEach(() => {
    // Restore the file system after each test
    mockFs.restore();
  });

  it("should retrieve credential from storage", async () => {
    const storage = new FileSystemStorageStrategy("namespace");

    const credential = await storage.getCredential("credential.json");

    expect(credential).toEqual(testCredential);
  });

  it("should store credential in storage", async () => {
    const storage = new FileSystemStorageStrategy("namespace");

    await storage.storeCredential("credential.json", testCredential);

    const storedCredential = await storage.getCredential("credential.json");

    expect(storedCredential).toEqual(testCredential);
  });

  it("should remove credential from storage", async () => {
    const storage = new FileSystemStorageStrategy("namespace");

    await storage.removeCredential("credential.json");

    const credential = await storage.getCredential("credential.json");

    expect(credential).toBeUndefined();
  });
});
