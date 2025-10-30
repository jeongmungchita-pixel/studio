import { 
  Firestore, 
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
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  UpdateData
} from 'firebase/firestore';
import { CacheManager } from '@/utils/cache/cache-manager';
import { APIError } from '@/utils/error/api-error';
import { withRetry } from '@/utils/error/error-handler';

export interface QueryOptions {
  where?: Array<{ field: string; operator: any; value: any }>;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
}

export interface PaginationOptions extends QueryOptions {
  page?: number;
  pageSize?: number;
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * BaseAPI 클래스
 * 모든 API 클래스의 기본 클래스로 공통 CRUD 작업을 제공합니다.
 */
export abstract class BaseAPI<T extends DocumentData = DocumentData> {
  protected abstract collectionName: string;
  protected firestore: Firestore;
  protected cache: CacheManager;
  protected cacheTTL: number = 5 * 60 * 1000; // 5분

  constructor(firestore: Firestore) {
    this.firestore = firestore;
    this.cache = CacheManager.getInstance();
  }

  /**
   * 문서 생성
   */
  async create(data: WithFieldValue<T>, id?: string): Promise<APIResponse<T & { id: string }>> {
    try {
      const docRef = id 
        ? doc(this.firestore, this.collectionName, id)
        : doc(collection(this.firestore, this.collectionName));

      const docData = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as WithFieldValue<T>;

      await withRetry(() => setDoc(docRef, docData));

      const result = { ...docData, id: docRef.id } as T & { id: string };
      
      // 캐시 업데이트
      this.cache.set(this.getCacheKey(docRef.id), result, this.cacheTTL);
      this.cache.invalidate(`${this.collectionName}:list:*`);

      return {
        data: result,
        success: true,
      };
    } catch (error) {
      throw new APIError(
        `Failed to create ${this.collectionName}`,
        'CREATE_FAILED',
        500
      );
    }
  }

  /**
   * ID로 문서 조회
   */
  async findById(id: string): Promise<APIResponse<(T & { id: string }) | null>> {
    try {
      // 캐시 확인
      const cacheKey = this.getCacheKey(id);
      const cached = this.cache.get<T & { id: string }>(cacheKey);
      if (cached) {
        return {
          data: cached,
          success: true,
        };
      }

      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await withRetry(() => getDoc(docRef));

      if (!docSnap.exists()) {
        return {
          data: null,
          success: true,
        };
      }

      const result = { ...docSnap.data(), id: docSnap.id } as T & { id: string };
      
      // 캐시 저장
      this.cache.set(cacheKey, result, this.cacheTTL);

      return {
        data: result,
        success: true,
      };
    } catch (error) {
      throw new APIError(
        `Failed to find ${this.collectionName} by id: ${id}`,
        'FIND_BY_ID_FAILED',
        500
      );
    }
  }

  /**
   * 문서 업데이트
   */
  async update(id: string, data: UpdateData<T>): Promise<APIResponse<T & { id: string }>> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      } as UpdateData<T>;

      await withRetry(() => updateDoc(docRef, updateData));

      // 업데이트된 문서 조회
      const updatedDoc = await this.findById(id);
      
      if (!updatedDoc.data) {
        throw new APIError(
          `Document not found after update: ${id}`,
          'UPDATE_VERIFICATION_FAILED',
          404
        );
      }

      // 캐시 무효화
      this.cache.invalidate(this.getCacheKey(id));
      this.cache.invalidate(`${this.collectionName}:list:*`);

      return updatedDoc as APIResponse<T & { id: string }>;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      throw new APIError(
        `Failed to update ${this.collectionName}: ${id}`,
        'UPDATE_FAILED',
        500
      );
    }
  }

  /**
   * 문서 삭제
   */
  async delete(id: string): Promise<APIResponse<boolean>> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await withRetry(() => deleteDoc(docRef));

      // 캐시 무효화
      this.cache.invalidate(this.getCacheKey(id));
      this.cache.invalidate(`${this.collectionName}:list:*`);

      return {
        data: true,
        success: true,
      };
    } catch (error) {
      throw new APIError(
        `Failed to delete ${this.collectionName}: ${id}`,
        'DELETE_FAILED',
        500
      );
    }
  }

  /**
   * 조건에 따른 문서 목록 조회
   */
  async findMany(options: QueryOptions = {}): Promise<APIResponse<(T & { id: string })[]>> {
    try {
      // 캐시 키 생성
      const cacheKey = this.getListCacheKey(options);
      const cached = this.cache.get<(T & { id: string })[]>(cacheKey);
      if (cached) {
        return {
          data: cached,
          success: true,
        };
      }

      const collectionRef = collection(this.firestore, this.collectionName);
      const constraints: QueryConstraint[] = [];

      // where 조건 추가
      if (options.where) {
        options.where.forEach(({ field, operator, value }) => {
          constraints.push(where(field, operator, value));
        });
      }

      // orderBy 조건 추가
      if (options.orderBy) {
        options.orderBy.forEach(({ field, direction }) => {
          constraints.push(orderBy(field, direction));
        });
      }

      // limit 조건 추가
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(collectionRef, ...constraints);
      const querySnapshot = await withRetry(() => getDocs(q));

      const results = querySnapshot.docs.map((doc: any) => ({
        ...doc.data(),
        id: doc.id,
      })) as (T & { id: string })[];

      // 캐시 저장
      this.cache.set(cacheKey, results, this.cacheTTL);

      return {
        data: results,
        success: true,
      };
    } catch (error) {
      throw new APIError(
        `Failed to find ${this.collectionName} documents`,
        'FIND_MANY_FAILED',
        500
      );
    }
  }

  /**
   * 페이지네이션된 문서 목록 조회
   */
  async findManyPaginated(options: PaginationOptions = {}): Promise<PaginatedResponse<T & { id: string }>> {
    const { page = 1, pageSize = 10, ...queryOptions } = options;
    
    try {
      // 전체 개수 조회 (캐시 사용)
      const totalCacheKey = `${this.collectionName}:count:${JSON.stringify(queryOptions)}`;
      let total = this.cache.get<number>(totalCacheKey);
      
      if (total === null) {
        const countResult = await this.findMany(queryOptions);
        total = countResult.data.length;
        this.cache.set(totalCacheKey, total, this.cacheTTL);
      }

      // 페이지네이션된 데이터 조회
      const paginatedOptions: QueryOptions = {
        ...queryOptions,
        limit: pageSize,
      };

      // TODO: startAfter를 사용한 실제 페이지네이션 구현
      // 현재는 간단한 limit 방식 사용
      const result = await this.findMany(paginatedOptions);

      const totalPages = Math.ceil(total / pageSize);

      return {
        data: result.data,
        success: true,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    } catch (error) {
      throw new APIError(
        `Failed to find paginated ${this.collectionName} documents`,
        'FIND_PAGINATED_FAILED',
        500
      );
    }
  }

  /**
   * 캐시 키 생성
   */
  protected getCacheKey(id: string): string {
    return `${this.collectionName}:${id}`;
  }

  /**
   * 리스트 캐시 키 생성
   */
  protected getListCacheKey(options: QueryOptions): string {
    return `${this.collectionName}:list:${JSON.stringify(options)}`;
  }

  /**
   * 캐시 무효화
   */
  protected invalidateCache(pattern?: string): void {
    if (pattern) {
      this.cache.invalidate(pattern);
    } else {
      this.cache.invalidate(`${this.collectionName}:*`);
    }
  }
}
