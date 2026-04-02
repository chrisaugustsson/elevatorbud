const DRAFT_PREFIX = "draft-";

export type DraftData<T> = {
  values: T;
  currentStep?: number;
  savedAt: number;
};

export function getDraftKey(id?: string): string {
  return id ? `${DRAFT_PREFIX}hiss-${id}` : `${DRAFT_PREFIX}ny-hiss`;
}

export function saveDraft<T>(key: string, values: T, currentStep?: number): void {
  try {
    const data: DraftData<T> = { values, currentStep, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

export function loadDraft<T>(key: string): DraftData<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DraftData<T>;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // silently ignore
  }
}

export function hasDraft(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}
