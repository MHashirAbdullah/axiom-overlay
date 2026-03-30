import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) setError(err.message);
        setLoading(false);
    }

    return (
        <div className="login">
            <div className="login-header">
                <div className="logo">A</div>
                <h1>Axiom</h1>
                <p>Sign in to your account</p>
            </div>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}
