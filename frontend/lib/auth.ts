const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function login(identifier: string, password: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
    });
    
    if (!res.ok) {
        throw new Error('Invalid credentials');
    }
    
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('trader_id', data.trader_id);
    return data;
}

export async function register(identifier: string, password: string, name: string, businessName: string) {
    const res = await fetch(`${NEXT_PUBLIC_API_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, name, business_name: businessName }),
    });
    
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to register');
    }
    
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('trader_id', data.trader_id);
    return data;
}

export async function refreshToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return null;
    
    try {
        const res = await fetch(`${NEXT_PUBLIC_API_URL}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });
        
        if (!res.ok) {
            logout();
            return null;
        }
        
        const data = await res.json();
        localStorage.setItem('access_token', data.access);
        return data.access;
    } catch (e) {
        logout();
        return null;
    }
}

export function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('trader_id');
    window.location.href = '/login';
}

export function getTraderId() {
    return typeof window !== 'undefined' ? localStorage.getItem('trader_id') : null;
}
