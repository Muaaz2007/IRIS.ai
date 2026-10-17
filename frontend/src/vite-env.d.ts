/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute backend base; empty string = same-origin /api proxy. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
