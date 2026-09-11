import { useState, useEffect } from 'react';

export default function UpdateModal() {
    const [updateInfo, setUpdateInfo] = useState<{
        status: 'available' | 'downloaded' | 'critical_required' | 'error';
        version?: string;
        minRequired?: string;
        notes?: string;
        message?: string;
    } | null>(null);

    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Trigger update check on component mount
        if (window.electronAPI) {
            window.electronAPI.checkForUpdates();

            const cleanup = window.electronAPI.onUpdateStatus((data: any) => {
                console.log('[UpdateModal] Received update status:', data);
                if (data.status === 'critical_required' || data.status === 'downloaded' || data.status === 'available') {
                    setUpdateInfo(data);
                    setDismissed(false);
                }
            });

            return () => {
                if (cleanup) cleanup();
            };
        }
    }, []);

    if (!updateInfo || (dismissed && updateInfo.status !== 'critical_required')) {
        return null;
    }

    const isCritical = updateInfo.status === 'critical_required';
    const isDownloaded = updateInfo.status === 'downloaded';

    const handleInstall = () => {
        if (window.electronAPI) {
            window.electronAPI.quitAndInstall();
        } else {
            window.open('https://axiomtranscriber.vercel.app/pricing', '_blank');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: isCritical ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                background: '#1e293b',
                border: isCritical ? '1px solid #ef4444' : '1px solid #334155',
                borderRadius: '16px',
                padding: '1.75rem',
                maxWidth: '380px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                color: '#f8fafc',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: isCritical ? '#ef4444' : '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '1.5rem'
                }}>
                    {isCritical ? '⚠️' : '🚀'}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
                    {isCritical ? 'Critical Update Required' : isDownloaded ? 'Update Ready to Install' : 'New Version Available'}
                </h3>

                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                    {isCritical
                        ? `Your Axiom Overlay version is out of date. Version ${updateInfo.version || ''} is mandatory to continue.`
                        : isDownloaded
                            ? `Version ${updateInfo.version || ''} has been downloaded. Restart Axiom Overlay now to apply the update.`
                            : `Version ${updateInfo.version || ''} is available with performance improvements and bug fixes.`}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button
                        onClick={handleInstall}
                        style={{
                            width: '100%',
                            background: isCritical ? '#ef4444' : '#6366f1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.7rem',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'opacity 0.15s'
                        }}
                    >
                        {isDownloaded || isCritical ? 'Restart & Install Update' : 'Download Update'}
                    </button>

                    {!isCritical && (
                        <button
                            onClick={() => setDismissed(true)}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                color: '#94a3b8',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '0.6rem',
                                fontWeight: 500,
                                fontSize: '0.825rem',
                                cursor: 'pointer'
                            }}
                        >
                            Later
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
