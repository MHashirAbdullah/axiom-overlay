// Type declarations for the contextBridge API exposed by preload.ts
interface ElectronAPI {
    openExternal: (url: string) => Promise<void>;
    setAlwaysOnTop: (val: boolean) => Promise<void>;
    resizeWindow: (height: number) => void;
    getDesktopSources: () => Promise<Array<{ id: string; name: string }>>;
    onOAuthCallback: (callback: (data: { access_token: string; refresh_token: string }) => void) => () => void;
    checkForUpdates: () => Promise<void>;
    quitAndInstall: () => Promise<void>;
    onUpdateStatus: (callback: (data: any) => void) => () => void;
    platform: string;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export {};
