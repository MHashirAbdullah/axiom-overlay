import { useCallback, useEffect, useRef, useState } from 'react';
import Groq from 'groq-sdk';
import { startSession, completeSession, openSuggestStream } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface TranscriptEntry {
    id: number;
    text: string;
    ts: number;
}

interface SuggestionChunk {
    id: number;
    text: string;
    done: boolean;
}

interface Props {
    token: string;
    authToken: string;
    onEnd: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

// Chunk every N milliseconds of audio for real-time transcription
const CHUNK_INTERVAL_MS = 4000;
// Max recent transcript text to send as context with each suggest call
const RECENT_CONTEXT_CHARS = 1200;
// Min transcript chars in a chunk before triggering a suggest call
const MIN_CHUNK_FOR_SUGGEST = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildRecentContext(entries: TranscriptEntry[]): string {
    const all = entries.map(e => e.text).join(' ');
    return all.length > RECENT_CONTEXT_CHARS ? all.slice(-RECENT_CONTEXT_CHARS) : all;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LiveSession({ token, authToken, onEnd }: Props) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [roundNumber, setRoundNumber] = useState<number | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestionChunk[]>([]);
    const [status, setStatus] = useState<'starting' | 'live' | 'stopping' | 'done'>('starting');
    const [error, setError] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const entryIdRef = useRef(0);
    const suggestionIdRef = useRef(0);
    const sessionIdRef = useRef<string | null>(null);
    const transcriptRef = useRef<TranscriptEntry[]>([]);
    const suggestActiveRef = useRef(false);
    const transcriptBottomRef = useRef<HTMLDivElement>(null);

    const groqRef = useRef<Groq>(new Groq({
        apiKey: import.meta.env.VITE_GROQ_API_KEY as string,
        dangerouslyAllowBrowser: true,
    }));

    // Keep transcriptRef in sync
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // ── Transcribe a blob chunk via Groq Whisper ──────────────────────────────
    const transcribeChunk = useCallback(async (blob: Blob) => {
        if (blob.size < 1000) return; // skip near-empty chunks
        try {
            const file = new File([blob], 'chunk.webm', { type: blob.type });
            const result = await groqRef.current.audio.transcriptions.create({
                file,
                model: 'whisper-large-v3-turbo',
                response_format: 'text',
            });
            const text = (result as unknown as string).trim();
            if (!text) return;

            const entry: TranscriptEntry = { id: entryIdRef.current++, text, ts: Date.now() };
            setTranscript(prev => [...prev, entry]);
            return text;
        } catch (err) {
            console.error('Transcription error', err);
        }
    }, []);

    // ── Stream suggestions for a transcript chunk ─────────────────────────────
    const fetchSuggestion = useCallback(async (chunkText: string) => {
        const sid = sessionIdRef.current;
        if (!sid || suggestActiveRef.current) return;
        suggestActiveRef.current = true;

        const recentContext = buildRecentContext(transcriptRef.current.slice(-20));
        const id = suggestionIdRef.current++;
        setSuggestions(prev => [...prev.slice(-4), { id, text: '', done: false }]);

        try {
            const reader = await openSuggestStream(sid, chunkText, recentContext, authToken);
            let accumulated = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                // Parse SSE lines
                const lines = value.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content ?? '';
                            if (delta) {
                                accumulated += delta;
                                setSuggestions(prev =>
                                    prev.map(s => s.id === id ? { ...s, text: accumulated } : s)
                                );
                            }
                        } catch { /* skip non-JSON lines */ }
                    }
                }
            }
            setSuggestions(prev =>
                prev.map(s => s.id === id ? { ...s, done: true } : s)
            );
        } catch (err) {
            console.error('Suggest stream error', err);
            setSuggestions(prev => prev.filter(s => s.id !== id));
        } finally {
            suggestActiveRef.current = false;
        }
    }, [authToken]);

    // ── Start recording ───────────────────────────────────────────────────────
    const startRecording = useCallback(async (sid: string) => {
        let stream: MediaStream;
        try {
            // Capture system audio + mic (user must grant permission)
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
            setError('Microphone permission denied.');
            return;
        }

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        // Fire every CHUNK_INTERVAL_MS
        recorder.start(CHUNK_INTERVAL_MS);

        // Process accumulated chunks periodically
        const interval = setInterval(async () => {
            if (chunksRef.current.length === 0) return;
            const batch = chunksRef.current.splice(0);
            const blob = new Blob(batch, { type: 'audio/webm;codecs=opus' });
            const text = await transcribeChunk(blob);
            if (text && text.length >= MIN_CHUNK_FOR_SUGGEST) {
                fetchSuggestion(text);
            }
        }, CHUNK_INTERVAL_MS);

        recorder.onstop = () => clearInterval(interval);
        setStatus('live');
    }, [transcribeChunk, fetchSuggestion]);

    // ── Init: start session on server, then start recording ──────────────────
    useEffect(() => {
        let cancelled = false;
        startSession(token, authToken).then(({ session_id, round_number }) => {
            if (cancelled) return;
            setSessionId(session_id);
            setRoundNumber(round_number);
            startRecording(session_id);
        }).catch(err => {
            if (!cancelled) setError(`Failed to start session: ${err.message}`);
        });
        return () => { cancelled = true; };
    }, [token, authToken, startRecording]);

    // ── Stop session ──────────────────────────────────────────────────────────
    const handleStop = useCallback(async () => {
        setStatus('stopping');
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
            recorder.stream.getTracks().forEach(t => t.stop());
        }

        // Flush remaining chunks
        if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
            await transcribeChunk(blob);
        }

        const sid = sessionIdRef.current;
        const fullText = transcriptRef.current.map(e => e.text).join(' ');
        if (sid && fullText) {
            await completeSession(sid, fullText, null, authToken).catch(console.error);
        }

        setStatus('done');
        onEnd();
    }, [authToken, onEnd, transcribeChunk]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (error) return (
        <div className="center-msg">
            <div className="error-msg">{error}</div>
            <button onClick={onEnd}>Back</button>
        </div>
    );

    if (status === 'starting') return <div className="center-msg">Starting session…</div>;

    return (
        <div className="live-session">
            {/* Header */}
            <div className="session-header">
                <div className="session-info">
                    <span className="live-dot" />
                    <span className="live-label">LIVE</span>
                    {roundNumber !== null && <span className="round-badge">R{roundNumber}</span>}
                </div>
                <button
                    className="stop-btn"
                    onClick={handleStop}
                    disabled={status === 'stopping'}
                >
                    {status === 'stopping' ? 'Saving…' : 'End'}
                </button>
            </div>

            {/* Two-pane layout */}
            <div className="session-body">
                {/* Left: Transcript */}
                <div className="transcript-pane">
                    <div className="pane-label">Transcript</div>
                    <div className="transcript-scroll">
                        {transcript.length === 0 && (
                            <div className="muted empty-state">Listening…</div>
                        )}
                        {transcript.map(entry => (
                            <div key={entry.id} className="transcript-entry">
                                {entry.text}
                            </div>
                        ))}
                        <div ref={transcriptBottomRef} />
                    </div>
                </div>

                {/* Right: AI Suggestions */}
                <div className="suggestions-pane">
                    <div className="pane-label">AI Assist</div>
                    <div className="suggestions-scroll">
                        {suggestions.length === 0 && (
                            <div className="muted empty-state">Suggestions appear as you speak…</div>
                        )}
                        {suggestions.map(s => (
                            <div key={s.id} className={`suggestion-card ${s.done ? 'done' : 'streaming'}`}>
                                {s.text || <span className="muted">…</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
