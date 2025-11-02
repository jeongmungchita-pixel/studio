import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
// Simple debounce util
function useDebouncedCallback<T extends (...args: unknown[]) => void>(cb: T, delay: number) {
  const timer = useRef<NodeJS.Timeout | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => cb(...args), delay);
  }, [cb, delay]) as T;
}
export type DraftKind = 'adult' | 'family';
function draftPath(kind: DraftKind, uid: string) {
  return kind === 'adult' ? `adultRegistrationDrafts/${uid}` : `familyRegistrationDrafts/${uid}`;
}
export function useDraft<T extends object>(kind: DraftKind) {
  const firestore = useFirestore();
  const { _user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canUse = !!firestore && !!_user?.uid;
  const load = useCallback(async (): Promise<T | null> => {
    if (!canUse) return null;
    setLoading(true);
    setError(null);
    try {
      const ref = doc(firestore!, draftPath(kind, _user!.uid));
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as T) : null;
    } catch (e: unknown) {
      setError((e as any)?.message || 'Failed to load draft');
      return null;
    } finally {
      setLoading(false);
    }
  }, [canUse, firestore, kind, _user]);
  const save = useCallback(async (data: Partial<T>) => {
    if (!canUse) return;
    try {
      const ref = doc(firestore!, draftPath(kind, _user!.uid));
      await setDoc(ref, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e: unknown) {
      // swallow silently; caller may choose to surface
    }
  }, [canUse, firestore, kind, _user]);
  const saveDebounced = useDebouncedCallback(save as (...args: unknown[]) => void, 400);
  const clear = useCallback(async () => {
    if (!canUse) return;
    try {
      const ref = doc(firestore!, draftPath(kind, _user!.uid));
      await deleteDoc(ref);
    } catch {}
  }, [canUse, firestore, kind, _user]);
  return useMemo(() => ({ load, save, saveDebounced, clear, loading, error, canUse }), [load, save, saveDebounced, clear, loading, error, canUse]);
}
