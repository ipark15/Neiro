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
  file: { uri: string; name: string; type: string };
  user_id: string;
  date: string;
}): Promise<Entry> {
  const form = new FormData();
  form.append('file', params.file as unknown as Blob);
  form.append('user_id', params.user_id);
  form.append('date', params.date);

  const { data } = await api.post<Entry>('/entries', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

export async function deleteEntry(entry_id: string): Promise<void> {
  await api.delete(`/entries/${entry_id}`);
}
