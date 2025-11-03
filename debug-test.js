// 디버깅용: Mock 데이터 확인
const { UserRole } = require('./src/types/auth.js');

// Mock 데이터 시뮬레이션
const testUsers = [
  {
    uid: 'user-1',
    email: 'admin@test.com',
    displayName: 'Admin User',
    role: UserRole.ADMIN,
  },
  {
    uid: 'user-2',
    email: 'member@test.com',
    displayName: 'Member User',
    role: UserRole.MEMBER,
  },
  {
    uid: 'user-3',
    email: 'owner@test.com',
    displayName: 'Club Owner',
    role: UserRole.CLUB_OWNER,
  },
];

console.log('UserRole.ADMIN:', UserRole.ADMIN);
console.log('All users:');
testUsers.forEach(user => {
  console.log(`- ${user.uid}: ${user.role} (${user.email})`);
});

console.log('\nFiltered ADMIN users:');
const adminUsers = testUsers.filter(user => user.role === UserRole.ADMIN);
console.log('Count:', adminUsers.length);
adminUsers.forEach(user => {
  console.log(`- ${user.uid}: ${user.role} (${user.email})`);
});
