'use client';

import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param storage The Firebase Storage instance.
 * @param path The path where the file should be stored (without extension).
 * @param file The file to upload.
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export async function uploadImage(storage: FirebaseStorage, path: string, file: File): Promise<string> {
  const fileExtension = file.name.split('.').pop();
  if (!fileExtension) {
    throw new Error('File has no extension');
  }
  const fullPath = `${path}.${fileExtension}`;
  const storageRef = ref(storage, fullPath);
  
  const metadata = {
    contentType: file.type,
  };

  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}
