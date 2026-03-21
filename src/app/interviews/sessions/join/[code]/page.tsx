import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { acceptInvitationAction } from '@/actions/session-actions';
import { getInvitationByCode } from '@/data-access';
import { getCurrentUserId } from '@/lib/auth';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinSessionPage({ params }: Props) {
  const { code } = await params;
  await getCurrentUserId(); // ensure authenticated

  const invitation = await getInvitationByCode(code);

  // Validate invitation
  if (!invitation) {
    return <ErrorView message="유효하지 않은 초대 링크입니다." />;
  }

  if (invitation.status !== 'pending') {
    return <ErrorView message="이미 사용되었거나 취소된 초대입니다." />;
  }

  if (new Date() > invitation.expiresAt) {
    return <ErrorView message="만료된 초대 링크입니다." />;
  }

  if (invitation.usedCount >= invitation.maxUses) {
    return <ErrorView message="초대 사용 횟수가 초과되었습니다." />;
  }

  // Accept invitation and redirect
  let sessionId: string;
  try {
    const result = await acceptInvitationAction(code);
    sessionId = result.sessionId;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '초대를 수락하는 중 오류가 발생했습니다.';
    return <ErrorView message={message} />;
  }

  redirect(`/interviews/sessions/${sessionId}`);
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="max-w-sm text-center">
        <AlertCircle className="text-iv-red mx-auto mb-3 size-10" />
        <h2 className="text-iv-text text-lg font-medium">초대 오류</h2>
        <p className="text-iv-text3 mt-2 text-sm">{message}</p>
        <Link
          href="/interviews/sessions"
          className="text-iv-accent mt-4 inline-block text-sm hover:underline"
        >
          세션 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
