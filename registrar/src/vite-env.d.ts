/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the browser sends API calls; defaults to the /api dev proxy. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
