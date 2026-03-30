import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import path from 'path';

let win: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    win = new BrowserWindow({
        width: 420,
        height: 640,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // ── Hidden from screen capture (macOS) ──────────────────────────────────────
    // setContentProtection(true) makes the window invisible to screen recording
    // tools and screen sharing — the OS-level protection, not just visual hiding.
    win.setContentProtection(true);

    // Visible on all workspaces including fullscreen apps
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Float above all other windows
    win.setAlwaysOnTop(true, 'floating');

    // Hide from Mission Control / Cmd+Tab switcher
    if (process.platform === 'darwin') {
        win.setHiddenInMissionControl(true);
    }

    // Position: bottom-right corner
    const { screen } = require('electron');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    win.setPosition(width - 440, height - 660);

    // Load app
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    // ── Global shortcuts ─────────────────────────────────────────────────────────
    // Toggle visibility
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
        if (!win) return;
        if (win.isVisible()) {
            win.hide();
        } else {
            win.show();
            win.focus();
        }
    });

    // Move window: Cmd+Arrow keys
    (['Up', 'Down', 'Left', 'Right'] as const).forEach(dir => {
        globalShortcut.register(`CommandOrControl+${dir}`, () => {
            if (!win) return;
            const [x, y] = win.getPosition();
            const step = 20;
            const moves: Record<string, [number, number]> = {
                Up: [x, y - step], Down: [x, y + step],
                Left: [x - step, y], Right: [x + step, y],
            };
            win.setPosition(...moves[dir]);
        });
    });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url));

ipcMain.handle('set-always-on-top', (_e, value: boolean) => {
    win?.setAlwaysOnTop(value, 'floating');
});

ipcMain.on('resize-window', (_e, height: number) => {
    if (win) win.setSize(420, Math.min(Math.max(height, 200), 800));
});
