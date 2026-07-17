const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function sendVoiceCommand(traderId: string, transcribedText: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/ledger/voice-command/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ transcribed_text: transcribedText }),
    });
    if (!res.ok) throw new Error('Failed to send voice command');
    return res.json();
}

export async function getLedgerSummary(traderId: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/ledger/${traderId}/summary/?period=today`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch summary');
    return res.json();
}

export async function getLedgerEntries(traderId: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/ledger/${traderId}/entries/`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch entries');
    return res.json();
}

export async function getRecentPayments(traderId: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/payments/${traderId}/recent/`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
}

export async function confirmPayment(paymentId: string, password?: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/payments/${paymentId}/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(password ? { password } : {}),
    });
    if (!res.ok) throw new Error('Failed to confirm payment');
    return res.json();
}

export async function getPaymentStatus(paymentId: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/payments/${paymentId}/status/`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch payment status');
    return res.json();
}

export async function downloadStatement(traderId: string, period = '30d') {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/ledger/${traderId}/statement/?period=${period}`, {
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to download statement');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sema_statement_${period}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
