/**
 * Firebase Club Repository Adapter (Admin SDK only)
 */
import { ClubRepositoryPort } from '@/ports';
import { Club } from '@/types/club';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Timestamp } from 'firebase-admin/firestore';
import { AdminFirestore } from '@/infra/bootstrap';

export class FirebaseClubRepositoryAdapter implements ClubRepositoryPort {
  private db: AdminFirestore;

  constructor(db: AdminFirestore) {
    this.db = db;
  }

  async findById(id: string): Promise<Club | null> {
    const docRef = this.db.doc(`clubs/${id}`);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    if (!data) {
      return null;
    }

    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Club;
  }

  async save(club: Club): Promise<ApiResponse<Club>> {
    try {
      const clubToSave = {
        ...club,
        updatedAt: Timestamp.now(),
        createdAt: club.createdAt ? Timestamp.fromDate(new Date(club.createdAt)) : Timestamp.now(),
      };

      await this.db.doc(`clubs/${club.id}`).set(clubToSave);

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

      await this.db.doc(`clubs/${id}`).update(updateData);

      const updatedDoc = await this.db.doc(`clubs/${id}`).get();
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
      await this.db.doc(`clubs/${id}`).delete();

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

      const clubsCollection = this.db.collection('clubs');
      
      // Get total count
      const totalSnapshot = await clubsCollection.get();
      const total = totalSnapshot.size;

      // Query with pagination
      const q = clubsCollection.orderBy('createdAt', 'desc').limit(pageSize);

      const querySnapshot = await q.get();
      const clubs: Club[] = [];

      querySnapshot.forEach((doc: any) => {
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
