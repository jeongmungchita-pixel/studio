'use client';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingStep } from '@/hooks/use-onboarding';
interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  progress: number;
  className?: string;
}
const steps = [
  { id: 'register', label: '회원가입', description: '계정 생성' },
  { id: 'verify', label: '이메일 인증', description: '본인 확인' },
  { id: 'approval', label: '승인 대기', description: '관리자 검토' },
  { id: 'profile', label: '프로필 설정', description: '정보 입력' },
  { id: 'complete', label: '완료', description: '서비스 이용' },
];
export function OnboardingProgress({ 
  currentStep, 
  progress, 
  className 
}: OnboardingProgressProps) {
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  return (
    <div className={cn('w-full max-w-3xl mx-auto', className)}>
      {/* 진행률 바 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">온보딩 진행률</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {/* 단계 표시 */}
      <div className="relative">
        {/* 연결선 */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted -z-10" />
        {/* 단계별 표시 */}
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = step.id === currentStep;
            const isUpcoming = index > currentStepIndex;
            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center relative',
                  'transition-all duration-300'
                )}
              >
                {/* 아이콘 */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'transition-all duration-300 mb-2',
                    {
                      'bg-primary text-primary-foreground': isCompleted || isCurrent,
                      'bg-muted text-muted-foreground': isUpcoming,
                      'ring-4 ring-primary/20': isCurrent,
                    }
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                {/* 라벨 */}
                <div className="text-center">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors duration-300',
                      {
                        'text-primary': isCompleted || isCurrent,
                        'text-muted-foreground': isUpcoming,
                      }
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {step.description}
                  </p>
                </div>
                {/* 현재 단계 표시 */}
                {isCurrent && (
                  <div className="absolute -bottom-6">
                    <ArrowRight className="w-4 h-4 text-primary animate-bounce" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
