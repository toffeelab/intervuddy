interface TipBoxProps {
  tip: string;
}

export function TipBox({ tip }: TipBoxProps) {
  return (
    <div className="bg-iv-amber/[0.07] border-iv-amber rounded-lg border-l-2 px-3.5 py-2.5">
      <p className="text-iv-amber mb-1 text-[11px] font-semibold">💡 면접 팁</p>
      <p className="text-iv-amber/80 text-[12px] leading-[1.75] whitespace-pre-line">{tip}</p>
    </div>
  );
}
