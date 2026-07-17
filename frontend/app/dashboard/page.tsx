"use client";
import { useEffect, useState } from 'react';
import { getLedgerSummary, getLedgerEntries, getRecentPayments, downloadStatement } from '@/lib/api';
import { refreshToken, getTraderId, logout } from '@/lib/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function Dashboard() {
    const [summary, setSummary] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [traderId, setTraderId] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const token = await refreshToken();
                const id = getTraderId();
                
                if (!token || !id) {
                    window.location.href = '/login';
                    return;
                }
                
                setTraderId(id);
                const sum = await getLedgerSummary(id);
                setSummary({ 
                    sales: sum.total_sales, 
                    profit: sum.profit, 
                    expenses: sum.total_expenses || 0,
                    wallet_balance: sum.wallet_balance || 0 
                });
                const ent = await getLedgerEntries(id);
                setEntries(ent || []);
                const pays = await getRecentPayments(id);
                setPayments(pays || []);
            } catch (error: any) {
                if (error.message && (error.message.includes('token') || error.message.includes('401'))) {
                    logout();
                }
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Compute chart data
    const chartData = [...entries].reverse().reduce((acc: any[], entry: any) => {
        const d = new Date(entry.created_at || Date.now());
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        let existing = acc.find(item => item.date === dateStr);
        if (!existing) {
            existing = { date: dateStr, profit: 0 };
            acc.push(existing);
        }
        
        const amount = Number(entry.amount);
        if (entry.entry_type === 'SALE' || entry.type === 'sale') {
            existing.profit += amount;
        } else {
            existing.profit -= amount;
        }
        return acc;
    }, []);

    // Ensure we have at least 7 days of labels even if empty
    const finalChartData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = chartData.find(item => item.date === dateStr);
        finalChartData.push({ date: dateStr, profit: existing ? existing.profit : 0 });
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-parchment to-[#e8dec5] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-jembe border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg text-ink font-medium animate-pulse tracking-wide">Loading your business data...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-parchment via-[#F1EAD8] to-[#e4d6bc] text-ink p-4 md:p-8 font-body selection:bg-marigold selection:text-ink pb-20">
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
                
                {/* Header Navbar */}
                <header className="flex justify-between items-center py-2 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-jembe to-[#12422c] rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl shadow-xl shadow-jembe/20">
                            S
                        </div>
                        <div>
                            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none">Sema</h1>
                            <p className="text-sm font-medium opacity-60">Business Ledger</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/" className="group flex items-center gap-2 bg-white/60 hover:bg-white backdrop-blur-md border border-white/40 shadow-sm px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:shadow-md">
                            <span className="transition-transform group-hover:-translate-x-1">←</span>
                            Back to Voice
                        </Link>
                    </div>
                </header>

                {/* PayHero Wallet Balance Card */}
                <div className="bg-gradient-to-br from-jembe to-[#154d33] p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-jembe/20 text-white relative overflow-hidden group border border-white/10 mt-2">
                    <div className="absolute right-0 top-0 bottom-0 w-64 bg-white/10 rounded-l-full blur-3xl pointer-events-none"></div>
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-white/70 mb-3 flex items-center gap-3">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                                PayHero Wallet Balance
                            </p>
                            <h2 className="text-5xl md:text-6xl font-mono font-bold text-white mb-1 tracking-tight">
                                <span className="text-3xl md:text-4xl text-white/50 mr-2 font-medium">KES</span>
                                {summary?.wallet_balance?.toLocaleString() || 0}
                            </h2>
                        </div>
                        <div className="hidden sm:block opacity-20 group-hover:scale-105 group-hover:opacity-40 transition-all duration-500">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                    </div>
                </div>

                {/* Top Stats Row (Today) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sales Card */}
                    <div className="bg-white/70 backdrop-blur-xl p-7 rounded-3xl shadow-sm border border-white/50 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-jembe/5 rounded-full blur-2xl group-hover:bg-jembe/10 transition-colors"></div>
                        <p className="text-sm font-bold uppercase tracking-wider text-ink/50 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-jembe"></span> Today's Sales
                        </p>
                        <h2 className="text-4xl font-mono font-bold text-ink mb-1">
                            <span className="text-2xl text-ink/40 mr-1">KES</span>
                            {summary?.sales?.toLocaleString() || 0}
                        </h2>
                    </div>

                    {/* Expenses Card */}
                    <div className="bg-white/70 backdrop-blur-xl p-7 rounded-3xl shadow-sm border border-white/50 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-clay/5 rounded-full blur-2xl group-hover:bg-clay/10 transition-colors"></div>
                        <p className="text-sm font-bold uppercase tracking-wider text-ink/50 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-clay"></span> Today's Expenses
                        </p>
                        <h2 className="text-4xl font-mono font-bold text-ink mb-1">
                            <span className="text-2xl text-ink/40 mr-1">KES</span>
                            {summary?.expenses?.toLocaleString() || 0}
                        </h2>
                    </div>

                    {/* Net Profit Card */}
                    <div className="bg-white/70 backdrop-blur-xl p-7 rounded-3xl shadow-sm border border-white/50 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-jembe/10 rounded-full blur-2xl group-hover:bg-jembe/20 transition-colors"></div>
                        <p className="text-sm font-bold uppercase tracking-wider text-ink/50 mb-2 flex items-center gap-2">
                            Today's Profit
                        </p>
                        <h2 className="text-4xl font-mono font-bold text-ink mb-1">
                            <span className="text-2xl text-ink/40 mr-1">KES</span>
                            {summary?.profit?.toLocaleString() || 0}
                        </h2>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col lg:flex-row gap-8 mt-4">
                    
                    {/* Left Column: Ledger Feed */}
                    <div className="flex-1 flex flex-col">
                        
                        {/* Profit Trend Chart */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-6 mb-8">
                            <h3 className="font-display text-lg font-bold mb-6 flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-jembe"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                                7-Day Profit Trend
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={finalChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 12, fill: 'rgba(27, 36, 32, 0.5)', fontWeight: 600 }} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 12, fill: 'rgba(27, 36, 32, 0.5)', fontWeight: 600 }} 
                                            tickFormatter={(val) => `KES ${val}`}
                                        />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.9)' }}
                                            formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Profit']}
                                            labelStyle={{ fontWeight: 'bold', color: '#1B2420', marginBottom: '4px' }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="profit" 
                                            stroke="#1F6E4A" 
                                            strokeWidth={4} 
                                            dot={{ fill: '#1F6E4A', r: 4, strokeWidth: 2, stroke: '#fff' }} 
                                            activeDot={{ r: 6, fill: '#E3A123', stroke: '#fff' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6 px-2">
                            <h3 className="font-display text-xl font-bold">Transaction History</h3>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 overflow-hidden">
                            {entries.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-bone rounded-full flex items-center justify-center mb-4">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/40"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                    </div>
                                    <p className="text-lg font-bold text-ink">No transactions yet</p>
                                    <p className="text-sm text-ink/60 mt-1">Tap the microphone to log your first sale.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col divide-y divide-ink/5">
                                    {entries.map((entry, idx) => (
                                        <div key={entry.id || idx} className="p-5 hover:bg-white/50 transition-colors flex justify-between items-center group relative">
                                            {/* Highlight Animation for Newest Entry */}
                                            {idx === 0 && (
                                                <div className="absolute inset-0 bg-marigold/5 motion-safe:animate-fade-out pointer-events-none"></div>
                                            )}
                                            
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${entry.entry_type === 'SALE' || entry.type === 'sale' ? 'bg-jembe/10 text-jembe' : 'bg-clay/10 text-clay'}`}>
                                                    {entry.entry_type === 'SALE' || entry.type === 'sale' ? (
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                                                    ) : (
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-ink text-base">{entry.description || (entry.entry_type === 'SALE' ? 'Sale Logged' : 'Expense Logged')}</p>
                                                    <p className="text-sm font-medium text-ink/50 mt-0.5">{entry.counterparty_name || 'Walk-in'} • {entry.item_description || 'General Item'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-mono font-bold text-lg ${entry.entry_type === 'SALE' || entry.type === 'sale' ? 'text-jembe' : 'text-ink'}`}>
                                                    {entry.entry_type === 'SALE' || entry.type === 'sale' ? '+' : '-'}KES {Number(entry.amount).toLocaleString()}
                                                </div>
                                                <div className="text-ink/40 text-xs font-semibold mt-1">
                                                    {new Date(entry.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Payments & Actions */}
                    <div className="w-full lg:w-[380px] flex flex-col gap-6">

                        {/* QR Code Section */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-6 flex flex-col items-center group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-jembe/5 rounded-full blur-3xl pointer-events-none"></div>
                            <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-jembe"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="8" x2="8" y1="12" y2="12"/><line x1="16" x2="16" y1="12" y2="12"/><line x1="12" x2="12" y1="8" y2="8"/><line x1="12" x2="12" y1="16" y2="16"/></svg>
                                Receive Payment
                            </h3>
                            <div className="bg-white p-3 rounded-2xl shadow-md border border-ink/5 mb-4 group-hover:scale-105 transition-transform duration-300 relative z-10">
                                {traderId ? (
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=payhero://pay?id=${traderId}&margin=0`} alt="PayHero QR Code" className="w-40 h-40" />
                                ) : (
                                    <div className="w-40 h-40 bg-ink/5 animate-pulse rounded-xl"></div>
                                )}
                            </div>
                            <p className="text-xs text-ink/60 text-center font-medium leading-relaxed relative z-10">
                                Customers can scan this code to pay directly into your PayHero wallet via M-Pesa.
                            </p>
                        </div>
                        
                        {/* Download Action */}
                        <button 
                            onClick={async () => {
                                if (!traderId) return;
                                try {
                                    await downloadStatement(traderId, '30d');
                                } catch (error) {
                                    console.error("Failed to download statement", error);
                                    alert("Samahani, failed to download statement.");
                                }
                            }}
                            className="group relative w-full bg-white/80 backdrop-blur-md border border-white p-5 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 text-left overflow-hidden hover:-translate-y-1"
                        >
                            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-marigold/20 to-transparent"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-marigold/20 text-marigold rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </div>
                                <div>
                                    <p className="font-bold text-ink text-base">Get Statement</p>
                                    <p className="text-xs font-medium text-ink/60 mt-0.5">Download 30-day PDF report</p>
                                </div>
                            </div>
                        </button>

                        {/* Recent Mobile Money Payments */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 p-6">
                            <h3 className="font-display text-lg font-bold mb-5 flex items-center justify-between">
                                Transfers
                                <span className="bg-ink/5 text-ink/60 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold">PayHero</span>
                            </h3>
                            
                            <div className="flex flex-col gap-4">
                                {payments.length === 0 && (
                                    <p className="text-sm text-ink/50 text-center py-4 font-medium">No mobile money transfers</p>
                                )}
                                {payments.map((payment, idx) => (
                                    <div key={payment.id || idx} className="flex justify-between items-center">
                                        <div className="flex items-center gap-3 w-2/3">
                                            <div className="w-10 h-10 rounded-full bg-bone border border-ink/5 flex items-center justify-center flex-shrink-0">
                                                <span className="font-bold text-ink/60 text-sm">
                                                    {(payment.customer_name || 'C')[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="truncate">
                                                <p className="font-bold text-sm text-ink truncate">{payment.customer_name || 'Customer'}</p>
                                                <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider
                                                    ${payment.status === 'SUCCESS' || payment.status === 'completed' ? 'text-jembe' : 
                                                      payment.status === 'FAILED' || payment.status === 'failed' ? 'text-clay' : 
                                                      'text-marigold'}`}>
                                                    {payment.status === 'SUCCESS' || payment.status === 'completed' ? 'COMPLETED' : payment.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="font-mono font-bold text-sm whitespace-nowrap text-right">
                                            KES {Number(payment.amount).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Logout Action */}
                        <div className="text-center mt-2">
                            <button 
                                onClick={logout}
                                className="text-sm font-bold text-clay/50 hover:text-clay transition-colors uppercase tracking-widest"
                            >
                                Log out
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </main>
    );
}
