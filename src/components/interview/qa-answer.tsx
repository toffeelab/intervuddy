import { KeywordBox } from '@/components/interview/keyword-box';
import { TipBox } from '@/components/interview/tip-box';
import { DeepQABox } from '@/components/interview/deep-qa-box';
import type { QAItem } from '@/data-access/types';

interface QAAnswerProps {
  item: QAItem;
}

export function QAAnswer({ item }: QAAnswerProps) {
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-line text-[13px] text-iv-text2 leading-[1.85]">
        {item.answer}
      </p>

      {item.keywords.length > 0 && <KeywordBox keywords={item.keywords} />}

      {item.tip && <TipBox tip={item.tip} type="tip" />}

      {item.jdTip && <TipBox tip={item.jdTip} type="jd" />}

      {item.deepQA.length > 0 && <DeepQABox items={item.deepQA} />}
    </div>
  );
}
