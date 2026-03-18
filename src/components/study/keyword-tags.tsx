import { JD_KEYWORDS } from '@/lib/constants';

export function KeywordTags() {
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {JD_KEYWORDS.map((keyword) => (
        <span
          key={keyword}
          className="bg-iv-bg3 border border-iv-border2 text-iv-jd border-iv-jd/30 text-[10px] font-mono px-1.5 py-0.5 rounded"
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}
