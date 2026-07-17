"use client";
import { useEffect, useState, useRef } from 'react';
import { sendVoiceCommand, getLedgerSummary } from '@/lib/api';
import { startListening, speak } from '@/lib/speech';
import Link from 'next/link';
import { refreshToken, getTraderId, logout } from '@/lib/auth'; 

export default function VoiceScreen() {
    const [isListening, setIsListening] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [liveTranscript, setLiveTranscript] = useState("");
    const [summary, setSummary] = useState<{sales: number} | null>(null);
    const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);
    const [traderId, setTraderId] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const recognitionRef = useRef<any>(null);
    const statusTimeoutRef = useRef<any>(null);

    const setFinalStatus = (text: string) => {
        setStatusText(text);
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => {
            setStatusText("");
            setLiveTranscript("");
        }, 5000);
    };

    const setPersistentStatus = (text: string) => {
        setStatusText(text);
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };

    const updateDashboardData = (id: string) => {
        getLedgerSummary(id).then(res => {
            setSummary({ sales: res.total_sales || 0 });
        }).catch(e => {
            if (e.message.includes('token') || e.message.includes('401')) {
                logout();
            }
        });
    };

    const pollPaymentStatus = async (transactionId: string) => {
        let attempts = 0;
        const maxAttempts = 15; // 30 seconds (15 * 2s)
        
        const interval = setInterval(async () => {
            try {
                const { getPaymentStatus } = await import('@/lib/api');
                const res = await getPaymentStatus(transactionId);
                
                if (res.status === 'SUCCESS' || res.status === 'FAILED') {
                    clearInterval(interval);
                    const msg = res.status === 'SUCCESS' ? "Payment fully completed." : "Payment failed.";
                    speak(msg, 'en-US');
                    setFinalStatus(msg);
                    if (traderId) updateDashboardData(traderId);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setPersistentStatus("Awaiting payment completion...");
            }
        }, 2000);
    };

    useEffect(() => {
        refreshToken().then(token => {
            const id = getTraderId();
            if (!token || !id) {
                window.location.href = '/login';
            } else {
                setTraderId(id);
                updateDashboardData(id);
                setAuthLoading(false);
            }
        });
    }, []);

    const handleMicClick = () => {
        if (!traderId) return;

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            setPersistentStatus("Processing...");
            return;
        }
        
        setIsListening(true);
        setPersistentStatus("");
        setLiveTranscript("");

        const rec = startListening(
            'en-US',
            async (transcript) => {
                setLiveTranscript(transcript);
                setIsListening(false);
                
                if (pendingConfirmationId) {
                    const text = transcript.toLowerCase();
                    if (text.includes('ndiyo') || text.includes('yes') || text.includes('sawa') || text.includes('ndio')) {
                        let pwd = undefined;
                        // Prompt for password on large payments (hackathon simple prompt)
                        pwd = window.prompt("Security check: Please enter your password to confirm this high-value payment");
                        if (pwd === null) {
                            speak("Payment cancelled.", 'en-US');
                            setFinalStatus("Payment cancelled (no password).");
                            setPendingConfirmationId(null);
                            return;
                        }

                        setPersistentStatus("Confirming payment...");
                        try {
                            const { confirmPayment } = await import('@/lib/api');
                            await confirmPayment(pendingConfirmationId, pwd);
                            const msg = "Payment confirmed. Waiting for network...";
                            speak(msg, 'en-US');
                            setPersistentStatus(msg);
                            if (traderId) updateDashboardData(traderId);
                            
                            // Poll for final completion
                            pollPaymentStatus(pendingConfirmationId);
                        } catch (e: any) {
                            speak("Sorry, it failed.", 'en-US');
                            setFinalStatus(e.message || "Confirmation failed.");
                        }
                    } else {
                        const msg = "Payment cancelled.";
                        speak(msg, 'en-US');
                        setFinalStatus(msg);
                    }
                    setPendingConfirmationId(null);
                    return;
                }
                
                try {
                    setPersistentStatus("Processing command...");
                    const result = await sendVoiceCommand(traderId, transcript);
                    
                    if (result.requires_confirmation) {
                        setPendingConfirmationId(result.transaction_id);
                        speak(result.spoken_confirmation, 'en-US');
                        setPersistentStatus(result.spoken_confirmation + " (Tap mic to confirm)");
                    } else if (result.spoken_confirmation) {
                        speak(result.spoken_confirmation, 'en-US');
                        setFinalStatus(result.spoken_confirmation);
                        
                        if (['log_sale', 'log_expense', 'get_summary', 'send_payment'].includes(result.intent)) {
                             updateDashboardData(traderId);
                        }

                        if (result.transaction_id) {
                            // If an immediate STK push or payout was triggered without needing confirmation
                            setPersistentStatus(result.spoken_confirmation + " (Waiting for network...)");
                            pollPaymentStatus(result.transaction_id);
                        }
                    }
                } catch (error) {
                    setFinalStatus("Sorry, an error occurred.");
                    speak("Sorry, an error occurred.", 'en-US');
                }
            },
            (error) => {
                setIsListening(false);
                setFinalStatus("Error listening, please try again.");
            },
            () => {
                setIsListening(false);
            },
            (interim) => {
                setLiveTranscript(interim);
            }
        );
        recognitionRef.current = rec;
    };

    if (authLoading) {
        return (
            <main className="min-h-screen bg-ink flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-jembe border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg text-bone/60 font-medium animate-pulse tracking-wide">Authenticating...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#121815] via-ink to-[#0A0F0D] flex flex-col items-center p-6 selection:bg-marigold selection:text-ink relative overflow-hidden">
            
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-jembe/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-marigold/5 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Top Navigation Bar */}
            <div className="w-full max-w-md flex justify-between items-center mb-8 relative z-10 pt-4">
                 <div className="flex flex-col">
                    <p className="font-display font-bold text-bone flex items-center gap-2">
                        Sema <span className="text-bone/40 text-xs uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">Business Ledger</span>
                    </p>
                    <p className="font-mono text-xs opacity-70 text-marigold mt-1">
                        Today: KES {summary?.sales || 0}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-bone rounded-full px-4 py-2 transition-all duration-300 text-xs font-bold tracking-wider uppercase">
                        Ledger
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </Link>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md relative z-10">
                
                {/* Greeting / Status Text (Top of center) */}
                <div className="mb-12 h-8 flex items-end justify-center">
                    {!isListening && !statusText && (
                        <p className="text-bone/50 font-medium tracking-wide">Tap the mic and speak</p>
                    )}
                </div>

                {/* Hero Mic Section */}
                <div className="relative flex flex-col items-center mb-16">
                    {/* Ripple Effects when listening */}
                    {isListening && (
                        <>
                            <div className="absolute inset-0 rounded-full border border-jembe/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                            <div className="absolute inset-0 rounded-full border border-jembe/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]"></div>
                            <div className="absolute inset-0 rounded-full bg-jembe/20 animate-pulse blur-xl"></div>
                        </>
                    )}

                    <button 
                        onClick={handleMicClick}
                        className={`relative z-10 w-36 h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center transition-all duration-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-marigold shadow-2xl ${
                            isListening 
                            ? 'bg-jembe scale-110 shadow-jembe/50' 
                            : 'bg-gradient-to-b from-[#2A3630] to-[#1A221E] border border-white/5 hover:scale-105 hover:border-white/10 hover:shadow-black/50'
                        }`}
                        aria-label={isListening ? "Stop listening" : "Start listening"}
                    >
                        {/* Custom Mic SVG */}
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`${isListening ? 'text-white' : 'text-jembe'}`}>
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="22"/>
                        </svg>
                    </button>
                    
                    {/* Waveform Visualization */}
                    <div className="absolute -bottom-12 flex items-end justify-center space-x-1.5 h-8">
                        {[...Array(5)].map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-1.5 rounded-full transition-all duration-150 ${
                                    isListening 
                                    ? 'bg-marigold animate-waveform motion-reduce:animate-none motion-reduce:h-4' 
                                    : 'bg-bone/10 h-1.5'
                                }`}
                                style={isListening ? { animationDelay: `${i * 0.15}s` } : {}}
                            ></div>
                        ))}
                    </div>
                </div>

                {/* Transcribed text / Status Display Card */}
                <div className="w-full min-h-[7rem] px-4">
                    {(liveTranscript || statusText) && (
                        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 w-full text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-jembe/50 to-transparent"></div>
                            
                            {isListening ? (
                                <div className="flex flex-col gap-2">
                                    <p className="font-body text-bone text-xl opacity-90 animate-pulse font-medium">
                                        {liveTranscript || "Listening..."}
                                    </p>
                                    <p className="text-bone/40 text-xs uppercase tracking-widest font-bold">Tap mic to send</p>
                                </div>
                            ) : (
                                <p className="font-body text-bone text-lg font-medium leading-snug">
                                    {statusText}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Inline Help Expansion Panel */}
                <div className="w-full mt-4">
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 mx-4">
                        <p className="text-bone/40 text-xs font-bold uppercase tracking-widest mb-5 text-center">Try saying something like...</p>
                        
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 text-sm">
                                <div className="w-10 h-10 rounded-full bg-marigold/10 flex items-center justify-center text-marigold text-lg shrink-0">💰</div>
                                <div className="flex flex-col">
                                    <span className="text-bone/90 font-medium">"I just sold some milk for 200"</span>
                                    <span className="text-bone/40 text-[10px] uppercase tracking-wider font-bold mt-0.5">Records Income</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                                <div className="w-10 h-10 rounded-full bg-clay/10 flex items-center justify-center text-clay text-lg shrink-0">📉</div>
                                <div className="flex flex-col">
                                    <span className="text-bone/90 font-medium">"I spent 500 shillings on sugar"</span>
                                    <span className="text-bone/40 text-[10px] uppercase tracking-wider font-bold mt-0.5">Tracks Costs</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                                <div className="w-10 h-10 rounded-full bg-jembe/10 flex items-center justify-center text-jembe text-lg shrink-0">💸</div>
                                <div className="flex flex-col">
                                    <span className="text-bone/90 font-medium">"Send 1000 to John right now"</span>
                                    <span className="text-bone/40 text-[10px] uppercase tracking-wider font-bold mt-0.5">Moves Money</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                                <div className="w-10 h-10 rounded-full bg-jembe/10 flex items-center justify-center text-jembe text-lg shrink-0">📥</div>
                                <div className="flex flex-col">
                                    <span className="text-bone/90 font-medium">"Ask Jane to pay her 300 balance"</span>
                                    <span className="text-bone/40 text-[10px] uppercase tracking-wider font-bold mt-0.5">Collects Debts</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                                <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 text-lg shrink-0">📊</div>
                                <div className="flex flex-col">
                                    <span className="text-bone/90 font-medium">"How did my business do today?"</span>
                                    <span className="text-bone/40 text-[10px] uppercase tracking-wider font-bold mt-0.5">Checks Performance</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Footer / Logout */}
            <div className="absolute bottom-6 w-full text-center z-10">
                <button onClick={logout} className="text-bone/30 hover:text-clay text-[10px] uppercase tracking-[0.2em] font-bold transition-colors">
                    Log out
                </button>
            </div>
        </main>
    );
}
