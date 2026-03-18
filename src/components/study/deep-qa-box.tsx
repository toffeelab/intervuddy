import type { FollowupQuestion } from '@/data-access/types';

interface DeepQABoxProps {
  items: FollowupQuestion[];
}

export function DeepQABox({ items }: DeepQABoxProps) {
  return (
    <div className="bg-iv-accent2/[0.06] border border-iv-accent2/15 rounded-lg p-3.5">
      <p className="text-[11px] font-semibold text-[#a89ff5] mb-2.5">
        꼬리 질문 &amp; 기술 심화
      </p>
      <div className="space-y-3">
        {items.map((dqa) => (
          <div key={dqa.id} className="space-y-1">
            <p className="text-[12px] text-[#a89ff5] font-medium">
              <span className="mr-1">↳</span>
              {dqa.question}
            </p>
            <p className="text-[12px] text-iv-text3 leading-[1.75] whitespace-pre-line pl-4">
              {dqa.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
