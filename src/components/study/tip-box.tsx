interface TipBoxProps {
  tip: string;
}

export function TipBox({ tip }: TipBoxProps) {
  return (
    <div className="rounded-lg px-3.5 py-2.5 border-l-2 bg-iv-amber/[0.07] border-iv-amber">
      <p className="text-[11px] font-semibold mb-1 text-iv-amber">
        💡 면접 팁
      </p>
      <p className="text-[12px] leading-[1.75] whitespace-pre-line text-iv-amber/80">
        {tip}
      </p>
    </div>
  );
}
