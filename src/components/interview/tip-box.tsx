import { cn } from '@/lib/utils';

interface TipBoxProps {
  tip: string;
  type?: 'tip' | 'jd';
}

export function TipBox({ tip, type = 'tip' }: TipBoxProps) {
  const isTip = type === 'tip';

  return (
    <div
      className={cn(
        'rounded-lg px-3.5 py-2.5 border-l-2',
        isTip
          ? 'bg-iv-amber/[0.07] border-iv-amber'
          : 'bg-iv-jd/[0.06] border-iv-jd'
      )}
    >
      <p
        className={cn(
          'text-[11px] font-semibold mb-1',
          isTip ? 'text-iv-amber' : 'text-iv-jd'
        )}
      >
        {isTip ? '💡 면접 팁' : '📌 JD 연결'}
      </p>
      <p
        className={cn(
          'text-[12px] leading-[1.75] whitespace-pre-line',
          isTip ? 'text-iv-amber/80' : 'text-iv-jd/80'
        )}
      >
        {tip}
      </p>
    </div>
  );
}
