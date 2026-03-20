import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: '서버 설정에 문제가 있습니다',
  AccessDenied: '접근이 거부되었습니다',
  Verification: '인증 링크가 만료되었거나 이미 사용되었습니다',
  OAuthSignin: '소셜 로그인 중 문제가 발생했습니다',
  OAuthCallback: '소셜 로그인 중 문제가 발생했습니다',
  OAuthCreateAccount: '소셜 로그인 중 문제가 발생했습니다',
  EmailCreateAccount: '이메일 계정 생성 중 문제가 발생했습니다',
  Callback: '인증 처리 중 문제가 발생했습니다',
  OAuthAccountNotLinked: '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 방법을 사용해주세요.',
};

const DEFAULT_ERROR_MESSAGE = '인증 중 문제가 발생했습니다';

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = (error && ERROR_MESSAGES[error]) ?? DEFAULT_ERROR_MESSAGE;

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <ShieldAlert className="text-destructive h-10 w-10" />
          </div>
          <CardTitle className="text-xl font-bold">로그인 오류</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            다시 로그인하기
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
