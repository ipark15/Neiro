import axios from 'axios';
import { supabase } from '@/lib/supabase';

const baseURL = process.env.EXPO_PUBLIC_API_URL;
if (!baseURL) {
  console.error(
    'EXPO_PUBLIC_API_URL is not set — API calls will fall back to http://localhost:8000 and fail in production.'
  );
}

const api = axios.create({
  baseURL: baseURL ?? 'http://localhost:8000',
});

// Attach the Supabase JWT — the backend derives the user from it and rejects
// unauthenticated requests, so user_id is never sent from the client.
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export interface Entry {
  id: string;
  user_id: string;
  date: string;
  language: string;
  transcript: string | null;
  audio_url: string;
  duration_seconds: number | null;
  created_at: string;
}

export async function uploadEntry(params: {
  file: { uri: string; name: string; type: string } | Blob;
  filename?: string;
  date: string;
  language: string;
  duration_seconds?: number;
}): Promise<Entry> {
  const form = new FormData();

  if (params.file instanceof Blob) {
    // Web: file is a raw Blob from MediaRecorder
    form.append('file', params.file, params.filename ?? 'recording.webm');
  } else {
    // Native: file is a { uri, name, type } object
    form.append('file', params.file as unknown as Blob);
  }

  form.append('date', params.date);
  form.append('language', params.language);
  if (params.duration_seconds != null) {
    form.append('duration_seconds', String(params.duration_seconds));
  }

  // Don't set Content-Type manually — the browser/axios must set it with the
  // multipart boundary (e.g. multipart/form-data; boundary=----xyz).
  // Overriding it strips the boundary and the server receives an empty file.
  const { data } = await api.post<Entry>('/entries', form);
  return data;
}

export async function getEntries(): Promise<Entry[]> {
  const { data } = await api.get<Entry[]>('/entries');
  return data;
}

export async function updateEntry(entry_id: string, transcript: string): Promise<Entry> {
  const { data } = await api.patch<Entry>(`/entries/${entry_id}`, { transcript });
  return data;
}

export async function deleteEntry(entry_id: string): Promise<void> {
  await api.delete(`/entries/${entry_id}`);
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  user_message: string;
  ai_text: string;
  ai_audio_base64: string;
}

export async function sendChatMessage(params: {
  file: Blob;
  filename?: string;
  language: string;
  persona?: string;
  conversation_history?: ChatMessage[];
}): Promise<ChatResponse> {
  const form = new FormData();
  form.append('file', params.file, params.filename ?? 'recording.webm');
  form.append('language', params.language);
  if (params.persona) form.append('persona', params.persona);
  form.append(
    'conversation_history',
    JSON.stringify(params.conversation_history ?? [])
  );
  const { data } = await api.post<ChatResponse>('/chat/message', form);
  return data;
}
