/**
 * Firebase Club Repository Adapter (Admin SDK 전용)
 */
import { ClubRepositoryPort } from '@/ports';
import { Club } from '@/types/club';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { firestoreSingleton } from '@/infra/bootstrap';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase-admin/firestore';

export class FirebaseClubRepositoryAdapter implements ClubRepositoryPort {
  private db = firestoreSingleton();

  async findById(id: string): Promise<Club | null> {
    const docRef = doc(this.db, 'clubs', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Club;
  }

  async save(club: Club): Promise<ApiResponse<Club>> {
    try {
      const clubToSave = {
        ...club,
        updatedAt: Timestamp.now(),
        createdAt: club.createdAt ? Timestamp.fromDate(club.createdAt) : Timestamp.now(),
      };

      await setDoc(doc(this.db, 'clubs', club.id), clubToSave);

      return {
        success: true,
        data: club,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SAVE_CLUB_FAILED',
          message: error.message || 'Failed to save club',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async update(id: string, data: Partial<Club>): Promise<ApiResponse<Club>> {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(this.db, 'clubs', id), updateData);

      const updatedDoc = await getDoc(doc(this.db, 'clubs', id));
      const clubData = updatedDoc.data() as Club;

      return {
        success: true,
        data: { ...clubData, id },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_CLUB_FAILED',
          message: error.message || 'Failed to update club',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    try {
      await deleteDoc(doc(this.db, 'clubs', id));

      return {
        success: true,
        data: { id },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DELETE_CLUB_FAILED',
          message: error.message || 'Failed to delete club',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async findAll(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Club>>> {
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 20;

      const clubsCollection = collection(this.db, 'clubs');
      
      // Get total count
      const totalSnapshot = await getCountFromServer(clubsCollection);
      const total = totalSnapshot.data().count;

      // Query with pagination
      const q = query(
        clubsCollection,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      const querySnapshot = await getDocs(q);
      const clubs: Club[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        clubs.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Club);
      });

      const result: PaginatedResponse<Club> = {
        items: clubs,
        total,
        page,
        pageSize,
        hasNext: clubs.length === pageSize && clubs.length < total,
        hasPrev: page > 1,
      };

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_CLUBS_FAILED',
          message: error.message || 'Failed to fetch clubs',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}
