"use client";
import { useState } from 'react';
import { register } from '@/lib/auth';
import Link from 'next/link';

export default function RegisterScreen() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(identifier, password, name, businessName);
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-parchment flex items-center justify-center p-6 selection:bg-marigold selection:text-ink">
            <div className="w-full max-w-sm bg-bone p-8 rounded-2xl shadow-sm border border-ink/5 my-8">
                <div className="mb-8 text-center">
                    <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">SEMA</h1>
                    <p className="text-ink/60 text-sm mt-2 font-mono">Create your account</p>
                </div>
                
                <form onSubmit={handleRegister} className="flex flex-col gap-5">
                    {error && <div className="bg-clay/10 text-clay p-3 rounded text-sm font-medium">{error}</div>}
                    
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Your Name</label>
                        <input 
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-parchment border border-ink/10 rounded-lg px-4 py-3 text-ink outline-none focus:border-jembe focus:ring-1 focus:ring-jembe transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">Business Name</label>
                        <input 
                            type="text"
                            value={businessName}
                            onChange={e => setBusinessName(e.target.value)}
                            className="w-full bg-parchment border border-ink/10 rounded-lg px-4 py-3 text-ink outline-none focus:border-jembe focus:ring-1 focus:ring-jembe transition-all"
                            required
                        />
                    </div>

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
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-ink/60">
                    Already have an account? <Link href="/login" className="text-jembe font-bold hover:underline">Log in</Link>
                </p>
            </div>
        </main>
    );
}
