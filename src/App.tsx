import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './views/Login';
import MeetingSelect from './views/MeetingSelect';
import PreSession from './views/PreSession';
import LiveSession from './views/LiveSession';
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
        });
        return () => subscription.unsubscribe();
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
    if (!session) return <Login />;

    const authToken = session.access_token;

    if (view === 'select' || !selectedToken) {
        return (
            <MeetingSelect
                authToken={authToken}
                onSelect={token => {
                    setSelectedToken(token);
                    setView('pre');
                }}
            />
        );
    }

    if (view === 'pre') {
        return (
            <PreSession
                token={selectedToken}
                authToken={authToken}
                onStart={() => setView('live')}
                onBack={() => { setSelectedToken(null); setView('select'); }}
            />
        );
    }

    if (view === 'live') {
        return (
            <LiveSession
                token={selectedToken}
                authToken={authToken}
                onEnd={() => { setSelectedToken(null); setView('select'); }}
            />
        );
    }

    return null;
}
