# @tempojs/fs-credential-storage

This library provides a credential storage implementation for the [Tempo](https://tempo.im) clients that uses the local file system.

## Installation

```bash
npm install @tempojs/fs-credential-storage
```
or
```bash
yarn add @tempojs/fs-credential-storage
```

## Usage

```typescript
const storage = new FileSystemStorageStrategy("namespace", "optional-encryption-key");
```

### Namespace
A namespace is essentially a directory name. It is used to separate credentials from other processes that may use this storage strategy. Use a namespace that is unique to your application.

### Encryption
The second parameter is an optional encryption key. If provided, the credentials will be encrypted using AES-256-GCM. The key must be 32 bytes long. If you do not provide a key, the credentials will be stored in plain text.

If your application is a desktop application, you should consider encrypting the credentials to prevent other applications from reading them from the file system. If your application is running in an environment you control (e.g. a server), you may not need to encrypt the credentials.

### Example
```typescript
import { FileSystemStorageStrategy } from "@tempojs/fs-credential-storage";
const storage = new FileSystemStorageStrategy("my-app", "my-secret-key");
await storage.storeCredential("credential.json", testCredential);
const credential = await storage.getCredential("credential.json");
await storage.removeCredential("credential.json");
```

The use of 'credential.json' as the credential name is arbitrary. You can use any name you want. The name is used as the file name in the file system; if your application needs to store multiple credentials, you can use different names for each credential. Just make sure the name is something deterministic so you can retrieve the credential later.


For more information, check out the [Tempo documentation](https://tempo.im/).