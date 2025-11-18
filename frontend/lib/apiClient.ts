// lib/apiClient.ts
const getBaseUrl = () => {
  // Server-side (Next.js runtime: API routes, SSR, server components)
  if (typeof window === "undefined") {
    // Talk directly to the backend container
    return process.env.API_INTERNAL_URL || "http://backend:5000";
  }

  // Browser: use the public URL (through Nginx)
  return process.env.NEXT_PUBLIC_API_URL || "";
};

export async function apiFetch(path: string, options?: RequestInit) {
  const baseUrl = getBaseUrl();

  // Normalize to avoid double slashes
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(`${normalizedBase}${normalizedPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    // Try to parse JSON error first, fallback to text
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      const text = await res.text().catch(() => "");
      body = text || undefined;
    }

    const msg =
      (body && (body.error || body.message)) ||
      `API error ${res.status}`;

    throw new Error(msg);
  }

  return res.json();
}
