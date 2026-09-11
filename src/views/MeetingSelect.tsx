import { useEffect, useState } from 'react';
import { fetchMeetings } from '../lib/api';

interface Meeting {
    id: string;
    title: string;
    token: string;
    meeting_type: 'interview' | 'meeting';
    sessions_count: number;
}

interface Props {
    authToken: string;
    onSelect: (token: string) => void;
    onLogout: () => void;
}

export default function MeetingSelect({ authToken, onSelect, onLogout }: Props) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [manualToken, setManualToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMeetings(authToken)
            .then((data: any) => setMeetings(data.meetings ?? []))
            .catch(() => setError('Failed to load workspaces'))
            .finally(() => setLoading(false));
    }, [authToken]);

    function handleManual(e: React.FormEvent) {
        e.preventDefault();
        const t = manualToken.trim();
        if (t) onSelect(t);
    }

    return (
        <div className="meeting-select">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Select Workspace</span>
                <button
                    onClick={onLogout}
                    className="secondary"
                    style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Logout
                </button>
            </div>

            {loading && <div className="muted">Loading…</div>}
            {error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="error-msg">{error}</div>
                    <button onClick={onLogout} className="secondary" style={{ width: '100%' }}>
                        Logout
                    </button>
                </div>
            )}

            {!loading && meetings.length > 0 && (
                <ul className="meeting-list">
                    {meetings.map(m => (
                        <li key={m.id} className="meeting-item" onClick={() => onSelect(m.token)}>
                            <div className="meeting-title">{m.title}</div>
                            <div className="meeting-meta">
                                <span className={`type-badge ${m.meeting_type}`}>{m.meeting_type}</span>
                                <span className="muted">{m.sessions_count} round{m.sessions_count !== 1 ? 's' : ''}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {!loading && meetings.length === 0 && !error && (
                <div className="muted empty-state">No workspaces yet. Enter a token below or create one in the dashboard.</div>
            )}

            <div className="divider">— or enter token —</div>

            <form className="manual-token-form" onSubmit={handleManual}>
                <input
                    type="text"
                    placeholder="axm_xxxxxxxx"
                    value={manualToken}
                    onChange={e => setManualToken(e.target.value)}
                    className="mono"
                />
                <button type="submit" disabled={!manualToken.trim()}>Go</button>
            </form>
        </div>
    );
}
