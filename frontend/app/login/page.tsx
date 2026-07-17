"use client";
import { useState } from 'react';
import { login } from '@/lib/auth';
import Link from 'next/link';

export default function LoginScreen() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(identifier, password);
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-parchment flex items-center justify-center p-6 selection:bg-marigold selection:text-ink">
            <div className="w-full max-w-sm bg-bone p-8 rounded-2xl shadow-sm border border-ink/5">
                <div className="mb-8 text-center">
                    <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">SEMA</h1>
                    <p className="text-ink/60 text-sm mt-2 font-mono">Voice Ledger Login</p>
                </div>
                
                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    {error && <div className="bg-clay/10 text-clay p-3 rounded text-sm font-medium">{error}</div>}
                    
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Email or Phone Number</label>
                        <input 
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            className="w-full bg-parchment border border-ink/10 rounded-lg px-4 py-3 text-ink outline-none focus:border-jembe focus:ring-1 focus:ring-jembe transition-all"
                            required
                        />
                    </div>
                    
                    <div className="relative">
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Password</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-parchment border border-ink/10 rounded-lg px-4 py-3 text-ink outline-none focus:border-jembe focus:ring-1 focus:ring-jembe transition-all pr-12"
                            required
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-[34px] text-ink/50 hover:text-ink transition-colors text-sm font-medium"
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-jembe text-white font-bold uppercase tracking-wider py-4 rounded-xl shadow mt-2 hover:bg-opacity-90 transition-all focus-visible:ring-4 focus-visible:ring-jembe focus-visible:ring-offset-2 focus-visible:ring-offset-parchment outline-none disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-ink/60">
                    New to Sema? <Link href="/register" className="text-jembe font-bold hover:underline">Register here</Link>
                </p>
            </div>
        </main>
    );
}
