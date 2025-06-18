import { SessionData } from '../types/streaming';

export async function getFileVersion(fileId: string, session: SessionData): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const fileData = await response.json();
      return fileData.updatedAt || fileData.updated_at || '';
    }
  } catch (error) {
    // Silently handle error - file might not exist
  }
  return '';
}
