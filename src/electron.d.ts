// Type declarations for the contextBridge API exposed by preload.ts
interface ElectronAPI {
    openExternal: (url: string) => Promise<void>;
    setAlwaysOnTop: (val: boolean) => Promise<void>;
    resizeWindow: (height: number) => void;
    getDesktopSources: () => Promise<Array<{ id: string; name: string }>>;
    platform: string;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export {};
