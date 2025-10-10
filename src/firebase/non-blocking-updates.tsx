'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';


/**
 * Initiates a setDoc or addDoc operation.
 * If docRef is a DocumentReference, it performs a setDoc.
 * If docRef is a CollectionReference, it performs an addDoc.
 * Does NOT await the write operation internally.
 */
export function upsertDocumentNonBlocking(
  ref: DocumentReference | CollectionReference,
  data: any,
  options?: SetOptions
) {
  let promise;
  let operation: 'create' | 'write' = 'create';

  if (ref.type === 'document') {
    promise = setDoc(ref, data, options || {});
    operation = options && 'merge' in options ? 'write' : 'create';
  } else {
    promise = addDoc(ref, data);
  }

  promise.catch(error => {
    const path = ref.type === 'document' ? (ref as DocumentReference).path : (ref as CollectionReference).path;
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: path,
        operation: operation,
        requestResourceData: data,
      })
    );
  });

  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}
