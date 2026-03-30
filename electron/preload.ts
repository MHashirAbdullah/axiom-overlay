import { contextBridge, ipcRenderer } from 'electron';

// Expose a controlled API surface to the renderer.
// Nothing from Node/Electron is directly accessible — all calls go through IPC.
contextBridge.exposeInMainWorld('electronAPI', {
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    setAlwaysOnTop: (val: boolean) => ipcRenderer.invoke('set-always-on-top', val),
    resizeWindow: (height: number) => ipcRenderer.send('resize-window', height),
    platform: process.platform,
});
