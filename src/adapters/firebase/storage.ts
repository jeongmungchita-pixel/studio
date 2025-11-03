/**
 * Firebase Storage Adapter
 */
import { StoragePort } from '@/ports';
import { ApiResponse } from '@/types/api';
import { getStorage } from 'firebase-admin/storage';
import { firestoreSingleton } from '@/infra/bootstrap';

export class FirebaseStorageAdapter implements StoragePort {
  private storage = getStorage();
  private db = firestoreSingleton();

  async uploadFile(path: string, file: Buffer | File): Promise<ApiResponse<{ url: string }>> {
    try {
      const bucket = this.storage.bucket();
      const fileRef = bucket.file(path);

      if (file instanceof File) {
        // Convert File to Buffer for Firebase Admin SDK
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type,
          },
        });
      } else {
        await fileRef.save(file);
      }

      // Make file public if needed
      await fileRef.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

      return {
        success: true,
        data: { url: publicUrl },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_FILE_FAILED',
          message: error.message || 'Failed to upload file',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async downloadFile(path: string): Promise<ApiResponse<Buffer>> {
    try {
      const bucket = this.storage.bucket();
      const fileRef = bucket.file(path);
      
      const [buffer] = await fileRef.download();

      return {
        success: true,
        data: buffer,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DOWNLOAD_FILE_FAILED',
          message: error.message || 'Failed to download file',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async deleteFile(path: string): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const bucket = this.storage.bucket();
      const fileRef = bucket.file(path);
      
      await fileRef.delete();

      return {
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DELETE_FILE_FAILED',
          message: error.message || 'Failed to delete file',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  getPublicUrl(path: string): string {
    const bucket = this.storage.bucket();
    return `https://storage.googleapis.com/${bucket.name}/${path}`;
  }
}
