import type { ChatSession } from '../types/research';

const SESSIONS_KEY = 'Biospace_sessions';
const CURRENT_SESSION_KEY = 'Biospace_current_session_id';
const MAX_SESSIONS = 50;

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  const trimmed = sessions.slice(0, MAX_SESSIONS);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
}

export function loadCurrentSessionId(): string | null {
  return localStorage.getItem(CURRENT_SESSION_KEY);
}

export function saveCurrentSessionId(id: string | null): void {
  if (id) {
    localStorage.setItem(CURRENT_SESSION_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}
