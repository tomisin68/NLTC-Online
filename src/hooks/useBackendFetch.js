import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_URL } from '../firebase';

export function useBackendFetch() {
  const { currentUser } = useAuth();

  return useCallback(async (method, path, body = null) => {
    if (!currentUser) throw new Error('Not signed in');
    const token = await currentUser.getIdToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BACKEND_URL}/api${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }, [currentUser]);
}
