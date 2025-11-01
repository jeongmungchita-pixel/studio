import { Firestore } from 'firebase/firestore';
import { UserAPI } from './user/user-api';
import { ClubAPI } from './club/club-api';
/**
 * APIFactory 클래스
 * 모든 API 인스턴스를 중앙에서 관리합니다.
 */
export class APIFactory {
  private static instance: APIFactory;
  private firestore: Firestore;
  private _userAPI?: UserAPI;
  private _clubAPI?: ClubAPI;
  private constructor(firestore: Firestore) {
    this.firestore = firestore;
  }
  static getInstance(firestore: Firestore): APIFactory {
    if (!APIFactory.instance) {
      APIFactory.instance = new APIFactory(firestore);
    }
    return APIFactory.instance;
  }
  get user(): UserAPI {
    if (!this._userAPI) {
      this._userAPI = new UserAPI(this.firestore);
    }
    return this._userAPI;
  }
  get club(): ClubAPI {
    if (!this._clubAPI) {
      this._clubAPI = new ClubAPI(this.firestore);
    }
    return this._clubAPI;
  }
  /**
   * 모든 API 인스턴스 초기화
   */
  reset(): void {
    this._userAPI = undefined;
    this._clubAPI = undefined;
  }
}
// 편의를 위한 함수들
let apiFactory: APIFactory | null = null;
export function initializeAPI(firestore: Firestore): APIFactory {
  apiFactory = APIFactory.getInstance(firestore);
  return apiFactory;
}
export function getAPI(): APIFactory {
  if (!apiFactory) {
    throw new Error('API Factory not initialized. Call initializeAPI first.');
  }
  return apiFactory;
}
