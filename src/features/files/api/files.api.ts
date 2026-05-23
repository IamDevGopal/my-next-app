import { apiRequest } from '@/lib/http/api-client';
import type { FileListResponse, FileRecord } from '../types/files.type';

export function listFiles(
  accessToken: string,
  params: { page?: number; limit?: number } = {},
) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();

  return apiRequest<FileListResponse>(
    `/api/v1/files${query ? `?${query}` : ''}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export function getFile(accessToken: string, fileId: string) {
  return apiRequest<FileRecord>(`/api/v1/files/${fileId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function deleteFile(accessToken: string, fileId: string) {
  return apiRequest<void>(`/api/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
