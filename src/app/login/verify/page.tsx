import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyRequestPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <Mail className="text-muted-foreground h-10 w-10" />
          </div>
          <CardTitle className="text-xl font-bold">이메일을 확인해주세요</CardTitle>
          <CardDescription>
            로그인 링크가 발송되었습니다. 이메일의 링크를 클릭하여 로그인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors"
          >
            로그인으로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
