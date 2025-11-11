import { apiFetch } from './apiClient';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: string;
  isApproved: boolean;
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response;
}

export async function registerUser(name: string, email: string, password: string): Promise<{ user: AuthUser }> {
  const response = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  return response;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const response = await apiFetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.user;
  } catch (error) {
    return null;
  }
}
