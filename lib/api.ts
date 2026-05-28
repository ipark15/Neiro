import axios from 'axios';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
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
  user_id: string;
  date: string;
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

  form.append('user_id', params.user_id);
  form.append('date', params.date);
  if (params.duration_seconds != null) {
    form.append('duration_seconds', String(params.duration_seconds));
  }

  // Don't set Content-Type manually — the browser/axios must set it with the
  // multipart boundary (e.g. multipart/form-data; boundary=----xyz).
  // Overriding it strips the boundary and the server receives an empty file.
  const { data } = await api.post<Entry>('/entries', form);
  return data;
}

export async function getEntries(user_id: string): Promise<Entry[]> {
  const { data } = await api.get<Entry[]>(`/entries/${user_id}`);
  return data;
}

export async function getEntry(user_id: string, date: string): Promise<Entry> {
  const { data } = await api.get<Entry>(`/entries/${user_id}/${date}`);
  return data;
}

export async function updateEntry(entry_id: string, transcript: string): Promise<Entry> {
  const { data } = await api.patch<Entry>(`/entries/${entry_id}`, { transcript });
  return data;
}

export async function deleteEntry(entry_id: string): Promise<void> {
  await api.delete(`/entries/${entry_id}`);
}
