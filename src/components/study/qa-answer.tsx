import { KeywordBox } from '@/components/study/keyword-box';
import { TipBox } from '@/components/study/tip-box';
import { DeepQABox } from '@/components/study/deep-qa-box';
import type { InterviewQuestion } from '@/data-access/types';

interface QAAnswerProps {
  item: InterviewQuestion;
}

export function QAAnswer({ item }: QAAnswerProps) {
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-line text-[13px] text-iv-text2 leading-[1.85]">
        {item.answer}
      </p>

      {item.keywords.length > 0 && <KeywordBox keywords={item.keywords} />}

      {item.tip && <TipBox tip={item.tip} />}

      {item.followups.length > 0 && <DeepQABox items={item.followups} />}
    </div>
  );
}
