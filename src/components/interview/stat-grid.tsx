import { STATS } from '@/lib/constants';

export function StatGrid() {
  return (
    <div className="grid grid-cols-2 gap-1.5 px-1">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="bg-iv-bg3 border border-iv-border rounded-lg py-2 text-center"
        >
          <p className={`font-mono font-bold text-[13px] ${stat.color}`}>
            {stat.value}
          </p>
          <p className="text-[9px] text-iv-text3 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
