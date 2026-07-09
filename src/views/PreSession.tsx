import { useEffect, useState } from 'react';
import { fetchMeetingContext } from '../lib/api';

interface ContextDoc {
    id: string;
    doc_type: string;
    title: string;
    raw_text: string;
}

interface PastRound {
    round_number: number;
    summary: any;
    raw_text: string | null;
}

interface MeetingContext {
    meeting: {
        id: string;
        title: string;
        type: string;
    };
    context_docs: ContextDoc[];
    past_rounds: PastRound[];
}

interface Props {
    token: string;
    authToken: string;
    onStart: (context: MeetingContext) => void;
    onBack: () => void;
}

function getSummaryText(summary: any, rawText: string | null): string {
    if (!summary) return rawText ? rawText.slice(0, 80) + '…' : 'No summary yet';
    if (typeof summary === 'object') {
        return summary.overall_summary || JSON.stringify(summary).slice(0, 80) + '…';
    }
    return String(summary);
}

const TYPE_LABELS: Record<string, string> = {
    resume: 'Resume',
    job_description: 'Job Description',
    notes: 'Notes',
    other: 'Other',
};

export default function PreSession({ token, authToken, onStart, onBack }: Props) {
    const [ctx, setCtx] = useState<MeetingContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMeetingContext(token, authToken)
            .then(setCtx)
            .catch(() => setError('Failed to load context'))
            .finally(() => setLoading(false));
    }, [token, authToken]);

    if (loading) return <div className="center-msg">Loading context…</div>;
    if (error) return (
        <div className="center-msg">
            <div className="error-msg">{error}</div>
            <button onClick={onBack}>Back</button>
        </div>
    );

    return (
        <div className="pre-session">
            <div className="pre-header">
                <button className="back-btn" onClick={onBack}>← Back</button>
                <div>
                    <div className="meeting-title">{ctx?.meeting?.title}</div>
                    <div className="token-display mono">{token}</div>
                </div>
            </div>

            <div className="context-preview">
                {ctx?.context_docs && ctx.context_docs.length > 0 && (
                    <div className="context-section">
                        <div className="section-header">Context Docs ({ctx.context_docs.length})</div>
                        {ctx.context_docs.map(doc => (
                            <div key={doc.id} className="context-doc-row">
                                <span className="doc-type-badge">{TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</span>
                                <span className="doc-title">{doc.title}</span>
                            </div>
                        ))}
                    </div>
                )}

                {ctx?.past_rounds && ctx.past_rounds.length > 0 && (
                    <div className="context-section">
                        <div className="section-header">Past Rounds ({ctx.past_rounds.length})</div>
                        {ctx.past_rounds.map(r => (
                            <div key={r.round_number} className="past-round-row">
                                <span className="round-badge">R{r.round_number}</span>
                                <span className="round-summary muted">
                                    {getSummaryText(r.summary, r.raw_text)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {(!ctx?.context_docs?.length && !ctx?.past_rounds?.length) && (
                    <div className="muted empty-state">No context docs or past rounds. AI will answer based on live transcript only.</div>
                )}
            </div>

            <button className="start-btn" onClick={() => ctx && onStart(ctx)}>
                Start Live Session
            </button>
        </div>
    );
}
