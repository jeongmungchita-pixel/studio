/**
 * Firestore 스키마 검증 및 일관성 체크
 * 
 * 코드의 타입 정의와 실제 Firestore 데이터를 비교하여
 * 불일치하는 부분을 찾아내고 수정 제안을 제공합니다.
 * 
 * 사용법:
 * npx tsx scripts/validate-firestore-schema.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
const serviceAccount = require('../serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

// 예상되는 스키마 정의 (코드의 타입 정의 기반)
const EXPECTED_SCHEMAS = {
  users: {
    required: ['id', 'uid', 'email', 'displayName', 'role', 'status'],
    optional: ['photoURL', 'phoneNumber', 'clubId', 'clubName', 'committeeId', 'provider'],
    enums: {
      role: ['SUPER_ADMIN', 'FEDERATION_ADMIN', 'CLUB_OWNER', 'CLUB_MANAGER', 'MEMBER', 'PARENT'],
      status: ['pending', 'approved', 'rejected'],
    }
  },
  clubs: {
    required: ['id', 'name', 'contactName', 'contactEmail', 'contactPhoneNumber', 'location'],
    optional: ['createdAt', 'updatedAt'],
  },
  members: {
    required: ['id', 'name', 'clubId', 'status'],
    optional: ['dateOfBirth', 'gender', 'email', 'phoneNumber', 'guardianIds', 'photoURL', 
               'activePassId', 'classId', 'memberType', 'familyRole', 'joinDate', 'level', 
               'levelColor', 'levelRank', 'grade', 'clubName'],
    enums: {
      status: ['active', 'inactive', 'pending'],
      gender: ['male', 'female'],
      memberType: ['individual', 'family'],
      familyRole: ['parent', 'child'],
    }
  },
  member_passes: {
    required: ['id', 'memberId', 'clubId', 'passTemplateId', 'status'],
    optional: ['startDate', 'endDate', 'totalSessions', 'remainingSessions', 'attendanceCount'],
    enums: {
      status: ['active', 'expired', 'pending'],
    }
  },
  pass_templates: {
    required: ['id', 'clubId', 'name', 'price', 'type'],
    optional: ['duration', 'sessions', 'description'],
    enums: {
      type: ['period', 'session'],
    }
  },
};

interface ValidationIssue {
  collection: string;
  documentId: string;
  field: string;
  issue: string;
  currentValue?: any;
  suggestion?: string;
}

/**
 * 컬렉션의 모든 문서 검증
 */
async function validateCollection(collectionName: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const schema = EXPECTED_SCHEMAS[collectionName as keyof typeof EXPECTED_SCHEMAS];
  
  if (!schema) {
    console.log(`⏭️  ${collectionName}: 스키마 정의 없음 (건너뜀)`);
    return issues;
  }

  console.log(`\n🔍 ${collectionName} 검증 중...`);
  
  const snapshot = await db.collection(collectionName).limit(100).get();
  
  if (snapshot.empty) {
    console.log(`  ℹ️  비어있음`);
    return issues;
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // 1. 필수 필드 체크
    for (const field of schema.required) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        issues.push({
          collection: collectionName,
          documentId: doc.id,
          field,
          issue: '필수 필드 누락',
          suggestion: `${field} 필드를 추가해야 합니다.`
        });
      }
    }

    // 2. 예상치 못한 필드 체크
    const allExpectedFields = [...schema.required, ...schema.optional];
    for (const field of Object.keys(data)) {
      if (!allExpectedFields.includes(field)) {
        issues.push({
          collection: collectionName,
          documentId: doc.id,
          field,
          issue: '예상치 못한 필드',
          currentValue: data[field],
          suggestion: `이 필드가 필요한지 확인하거나 삭제를 고려하세요.`
        });
      }
    }

    // 3. Enum 값 체크
    if ('enums' in schema && schema.enums) {
      for (const [field, allowedValues] of Object.entries(schema.enums)) {
        if (field in data && data[field] !== null && data[field] !== undefined) {
          const allowedValuesArray = Array.isArray(allowedValues) ? allowedValues : [];
          if (!allowedValuesArray.includes(data[field])) {
            issues.push({
              collection: collectionName,
              documentId: doc.id,
              field,
              issue: '잘못된 enum 값',
              currentValue: data[field],
              suggestion: `허용된 값: ${allowedValuesArray.join(', ')}`
            });
          }
        }
      }
    }

    // 4. 타입 체크
    if ('id' in data && data.id !== doc.id) {
      issues.push({
        collection: collectionName,
        documentId: doc.id,
        field: 'id',
        issue: 'id 필드가 문서 ID와 불일치',
        currentValue: data.id,
        suggestion: `id를 ${doc.id}로 변경해야 합니다.`
      });
    }
  }

  if (issues.length === 0) {
    console.log(`  ✅ 문제 없음 (${snapshot.size}개 문서 검증)`);
  } else {
    console.log(`  ⚠️  ${issues.length}개 이슈 발견`);
  }

  return issues;
}

/**
 * 이슈 수정 제안 생성
 */
function generateFixSuggestions(issues: ValidationIssue[]): string {
  let suggestions = '\n' + '='.repeat(80) + '\n';
  suggestions += '🔧 수정 제안\n';
  suggestions += '='.repeat(80) + '\n\n';

  // 컬렉션별로 그룹화
  const issuesByCollection = issues.reduce((acc, issue) => {
    if (!acc[issue.collection]) {
      acc[issue.collection] = [];
    }
    acc[issue.collection].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);

  for (const [collection, collectionIssues] of Object.entries(issuesByCollection)) {
    suggestions += `\n📦 ${collection} (${collectionIssues.length}개 이슈)\n`;
    suggestions += '-'.repeat(80) + '\n';

    // 이슈 타입별로 그룹화
    const issuesByType = collectionIssues.reduce((acc, issue) => {
      if (!acc[issue.issue]) {
        acc[issue.issue] = [];
      }
      acc[issue.issue].push(issue);
      return acc;
    }, {} as Record<string, ValidationIssue[]>);

    for (const [issueType, typeIssues] of Object.entries(issuesByType)) {
      suggestions += `\n  ⚠️  ${issueType} (${typeIssues.length}건)\n`;
      
      // 처음 5개만 표시
      const displayIssues = typeIssues.slice(0, 5);
      for (const issue of displayIssues) {
        suggestions += `    - 문서: ${issue.documentId}\n`;
        suggestions += `      필드: ${issue.field}\n`;
        if (issue.currentValue !== undefined) {
          suggestions += `      현재값: ${JSON.stringify(issue.currentValue)}\n`;
        }
        suggestions += `      제안: ${issue.suggestion}\n\n`;
      }

      if (typeIssues.length > 5) {
        suggestions += `    ... 외 ${typeIssues.length - 5}건\n\n`;
      }
    }
  }

  return suggestions;
}

/**
 * 자동 수정 가능한 이슈 수정
 */
async function autoFixIssues(issues: ValidationIssue[], dryRun: boolean = true): Promise<number> {
  console.log('\n' + '='.repeat(80));
  console.log(dryRun ? '🔍 자동 수정 시뮬레이션 (실제 변경 없음)' : '🔧 자동 수정 실행');
  console.log('='.repeat(80) + '\n');

  let fixedCount = 0;

  for (const issue of issues) {
    // id 필드 불일치 수정
    if (issue.field === 'id' && issue.issue === 'id 필드가 문서 ID와 불일치') {
      console.log(`${dryRun ? '[시뮬레이션]' : '[수정]'} ${issue.collection}/${issue.documentId}: id 필드 수정`);
      
      if (!dryRun) {
        await db.collection(issue.collection).doc(issue.documentId).update({
          id: issue.documentId
        });
      }
      fixedCount++;
    }

    // 필수 필드 누락 - 기본값 추가
    if (issue.issue === '필수 필드 누락') {
      const defaultValues: Record<string, any> = {
        id: issue.documentId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      if (issue.field in defaultValues) {
        console.log(`${dryRun ? '[시뮬레이션]' : '[수정]'} ${issue.collection}/${issue.documentId}: ${issue.field} 기본값 추가`);
        
        if (!dryRun) {
          await db.collection(issue.collection).doc(issue.documentId).update({
            [issue.field]: defaultValues[issue.field]
          });
        }
        fixedCount++;
      }
    }
  }

  console.log(`\n${dryRun ? '시뮬레이션' : '실제'} 수정 가능: ${fixedCount}개\n`);
  return fixedCount;
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Firestore 스키마 검증');
  console.log('='.repeat(80));

  try {
    const allIssues: ValidationIssue[] = [];

    // 모든 컬렉션 검증
    for (const collectionName of Object.keys(EXPECTED_SCHEMAS)) {
      const issues = await validateCollection(collectionName);
      allIssues.push(...issues);
    }

    // 결과 요약
    console.log('\n' + '='.repeat(80));
    console.log('📊 검증 결과');
    console.log('='.repeat(80));
    console.log(`\n총 이슈: ${allIssues.length}개\n`);

    if (allIssues.length > 0) {
      // 수정 제안 출력
      const suggestions = generateFixSuggestions(allIssues);
      console.log(suggestions);

      // 자동 수정 시뮬레이션
      await autoFixIssues(allIssues, true);

      console.log('💡 자동 수정을 실행하려면:');
      console.log('   npm run fix:schema\n');
    } else {
      console.log('✅ 모든 데이터가 스키마와 일치합니다!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();
