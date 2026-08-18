import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openImage: () => ipcRenderer.invoke('dialog:openImage'),
  openEnvironmentImage: () => ipcRenderer.invoke('dialog:openEnvironmentImage'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
  getStore: () => ipcRenderer.invoke('store:get'),
  setStore: (data: any) => ipcRenderer.invoke('store:set', data),
  saveBase64: (params: { base64Data: string; targetPath: string; quality?: number }) =>
    ipcRenderer.invoke('file:saveBase64', params),
});
