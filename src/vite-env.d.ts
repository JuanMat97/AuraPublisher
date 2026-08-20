/// <reference types="vite/client" />

export interface SelectedImage {
  path: string;
  filename: string;
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
}

export interface ElectronAPI {
  openImage: () => Promise<SelectedImage | null>;
  openEnvironmentImage: () => Promise<{ path: string; filename: string; width: number; height: number } | null>;
  selectFolder: () => Promise<string | null>;
  openPath: (path: string) => Promise<string>;
  getStore: () => Promise<any>;
  setStore: (data: any) => Promise<boolean>;
  saveBase64: (params: { base64Data: string; targetPath: string; quality?: number }) => Promise<{ success: boolean; path?: string; error?: string }>;
  saveBuffer: (params: { buffer: Uint8Array | ArrayBuffer; targetPath: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  readTemplate: (filePath: string) => Promise<{ success: boolean; buffer?: Uint8Array; error?: string }>;
  scanLibrary?: (basePath?: string) => Promise<any>;
}


declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
