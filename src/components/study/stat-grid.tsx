import { STATS } from '@/lib/constants';

export function StatGrid() {
  return (
    <div className="grid grid-cols-2 gap-1.5 px-1">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="bg-iv-bg3 border-iv-border rounded-lg border py-2 text-center"
        >
          <p className={`font-mono text-[13px] font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-iv-text3 mt-0.5 text-[9px]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
