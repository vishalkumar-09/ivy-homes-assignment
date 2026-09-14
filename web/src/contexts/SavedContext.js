'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from './AuthContext';

const SavedContext = createContext(null);

export function SavedProvider({ children }) {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState(new Set());

  const fetchSavedIds = useCallback(async () => {
    if (!user) { setSavedIds(new Set()); return; }
    try {
      const res = await apiFetch('/api/saved');
      if (res && res.ok) {
        const data = await res.json();
        setSavedIds(new Set((data.results || []).map(r => r.listing_id)));
      }
    } catch (e) { console.error('fetchSavedIds:', e); }
  }, [user]);

  useEffect(() => { fetchSavedIds(); }, [fetchSavedIds]);

  const toggleSave = useCallback(async (listingId, openLogin) => {
    if (!user) { openLogin?.(); return; }
    const isSaved = savedIds.has(listingId);
    try {
      if (isSaved) {
        const res = await apiFetch(`/api/saved/${listingId}`, { method: 'DELETE' });
        if (res && res.ok) setSavedIds(prev => { const n = new Set(prev); n.delete(listingId); return n; });
      } else {
        const res = await apiFetch('/api/saved', { method: 'POST', body: JSON.stringify({ listing_id: listingId }) });
        if (res && res.ok) setSavedIds(prev => new Set([...prev, listingId]));
      }
    } catch (e) { console.error('toggleSave:', e); }
  }, [user, savedIds]);

  return (
    <SavedContext.Provider value={{ savedIds, fetchSavedIds, toggleSave }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  return useContext(SavedContext);
}
