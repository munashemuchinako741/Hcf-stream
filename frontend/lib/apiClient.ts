// lib/apiClient.ts
const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    // server-side (inside Docker)
    return process.env.API_INTERNAL_URL || 'http://backend:5000';
  }
  // browser
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

export async function apiFetch(path: string, options?: RequestInit) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}
