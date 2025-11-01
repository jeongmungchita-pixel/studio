// 임시 스크립트: 클럽 관리자 계정에 clubId 추가
// 사용법: 브라우저 콘솔에서 실행

import { doc, updateDoc } from 'firebase/firestore';

// 브라우저 콘솔에서 실행할 코드:
/*
(async () => {
  // 1. 현재 로그인한 사용자 UID 확인
  const auth = firebase.auth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('로그인이 필요합니다');
    return;
  }
  
  console.log('현재 사용자 UID:', currentUser.uid);
  
  // 2. Firestore에서 클럽 목록 확인
  const db = firebase.firestore();
  const clubsSnapshot = await db.collection('clubs').get();
  
  console.log('사용 가능한 클럽:');
  clubsSnapshot.forEach(doc => {
    console.log(`- ${doc.id}: ${doc.data().name}`);
  });
  
  // 3. 클럽 ID 입력 (위 목록에서 선택)
  const clubId = prompt('클럽 ID를 입력하세요:');
  const club = await db.collection('clubs').doc(clubId).get();
  
  if (!club.exists) {
    console.error('클럽을 찾을 수 없습니다');
    return;
  }
  
  // 4. 사용자 프로필 업데이트
  await db.collection('users').doc(currentUser.uid).update({
    clubId: clubId,
    clubName: club.data().name
  });
  
  console.log('✅ 클럽 정보가 업데이트되었습니다. 페이지를 새로고침하세요.');
})();
*/
