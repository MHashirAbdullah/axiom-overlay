import { contextBridge, ipcRenderer } from 'electron';

// Expose a controlled API surface to the renderer.
// Nothing from Node/Electron is directly accessible — all calls go through IPC.
contextBridge.exposeInMainWorld('electronAPI', {
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    setAlwaysOnTop: (val: boolean) => ipcRenderer.invoke('set-always-on-top', val),
    resizeWindow: (height: number) => ipcRenderer.send('resize-window', height),
    getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
    onOAuthCallback: (callback: (data: { access_token: string; refresh_token: string }) => void) => {
        const subscription = (_event: any, data: { access_token: string; refresh_token: string }) => callback(data);
        ipcRenderer.on('oauth-callback', subscription);
        return () => {
            ipcRenderer.removeListener('oauth-callback', subscription);
        };
    },
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    onUpdateStatus: (callback: (data: any) => void) => {
        const subscription = (_event: any, data: any) => callback(data);
        ipcRenderer.on('update-status', subscription);
        return () => {
            ipcRenderer.removeListener('update-status', subscription);
        };
    },
    platform: process.platform,
});
