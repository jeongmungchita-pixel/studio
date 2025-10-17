'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface ApprovalActionsProps {
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  disabled?: boolean;
}

export function ApprovalActions({ onApprove, onReject, disabled = false }: ApprovalActionsProps) {
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 필요',
        description: '거부 사유를 입력해주세요',
      });
      return;
    }

    setIsRejecting(true);
    try {
      await onReject(rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason('');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleApprove}
        disabled={disabled || isApproving || isRejecting}
        className="bg-green-600 hover:bg-green-700"
      >
        {isApproving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        승인
      </Button>

      <Button
        onClick={() => setShowRejectDialog(true)}
        disabled={disabled || isApproving || isRejecting}
        variant="destructive"
      >
        {isRejecting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4 mr-2" />
        )}
        거부
      </Button>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>승인 거부</AlertDialogTitle>
            <AlertDialogDescription>
              거부 사유를 입력해주세요. 사용자에게 전달됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="거부 사유를 입력하세요..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              거부
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
