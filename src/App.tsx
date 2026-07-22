import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './views/Login';
import MeetingSelect from './views/MeetingSelect';
import PreSession from './views/PreSession';
import LiveSession from './views/LiveSession';
import UpdateModal from './components/UpdateModal';
import './styles.css';

type AppView = 'login' | 'select' | 'pre' | 'live';

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [view, setView] = useState<AppView>('select');
    const [selectedToken, setSelectedToken] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setAuthLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            if (!s) {
                setSelectedToken(null);
                setView('select');
            }
        });

        // Listen for OAuth deep link callbacks from Electron main process
        const cleanupOAuth = window.electronAPI?.onOAuthCallback(async ({ access_token, refresh_token }) => {
            setAuthLoading(true);
            const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });
            if (error) {
                console.error('[App] Failed to set OAuth session:', error.message);
            } else if (data.session) {
                setSession(data.session);
            }
            setAuthLoading(false);
        });

        return () => {
            subscription.unsubscribe();
            if (cleanupOAuth) cleanupOAuth();
        };
    }, []);

    // Resize window based on current view
    useEffect(() => {
        const heights: Record<AppView, number> = {
            login: 380,
            select: 480,
            pre: 520,
            live: 660,
        };
        window.electronAPI?.resizeWindow(heights[view] ?? 480);
    }, [view]);

    if (authLoading) return <div className="center-msg">…</div>;
    if (!session) {
        return (
            <>
                <UpdateModal />
                <Login />
            </>
        );
    }

    const authToken = session.access_token;

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <>
            <UpdateModal />
            {view === 'select' || !selectedToken ? (
                <MeetingSelect
                    authToken={authToken}
                    onSelect={token => {
                        setSelectedToken(token);
                        setView('pre');
                    }}
                    onLogout={handleLogout}
                />
            ) : view === 'pre' ? (
                <PreSession
                    token={selectedToken}
                    authToken={authToken}
                    onStart={() => setView('live')}
                    onBack={() => { setSelectedToken(null); setView('select'); }}
                />
            ) : (
                <LiveSession
                    token={selectedToken}
                    authToken={authToken}
                    onEnd={() => { setSelectedToken(null); setView('select'); }}
                />
            )}
        </>
    );
}
