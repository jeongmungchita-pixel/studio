'use client';

import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param storage The Firebase Storage instance.
 * @param path The path where the file should be stored.
 * @param file The file to upload.
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export async function uploadImage(storage: FirebaseStorage, path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}
