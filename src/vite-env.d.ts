/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * SHA-256 hex digest of the unlock password. Compared against the hash
   * of the user's typed input — plaintext never enters the client bundle.
   * Generate with:
   *   node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
   */
  readonly VITE_HIDDEN_PASSWORD_SHA256?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

