interface KeywordBoxProps {
  keywords: string[];
}

export function KeywordBox({ keywords }: KeywordBoxProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className="bg-iv-bg3 border border-iv-border2 text-iv-text3 text-[10px] font-mono px-1.5 py-0.5 rounded"
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}
