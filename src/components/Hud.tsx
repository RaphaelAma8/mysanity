import { moodOf, type Weather } from "@/lib/sim/engine";
import { BLOCKS_PER_DAY, BLOCK_NAMES, NEED_KEYS, NEED_META, type Sim } from "@/lib/sim/types";

const W: Record<Weather, string> = { sunny: "☀️", cloudy: "☁️", rain: "🌧️", snow: "❄️" };

export function Hud({ sim, weather }: { sim: Sim; weather: Weather }) {
  const mood = moodOf(sim.needs);
  const time = sim.block >= BLOCKS_PER_DAY ? "Late, time for bed" : BLOCK_NAMES[sim.block];
  return (
    <section aria-label="Your day" className="mb-1.5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line" aria-label={`Day ${sim.day}, ${time}`}>Day {sim.day} · {time} {W[weather]}</span>
        <span className="rounded-full bg-lantern px-3 py-1.5 font-bold text-lantern-ink tabular-nums" aria-label={`${sim.money} Canadian dollars of game money`}>${sim.money.toLocaleString("en-CA")}</span>
        <span className="rounded-full bg-surface px-3 py-1.5 ring-1 ring-line" aria-label={`Mood: ${mood.label}`}>{mood.face} {mood.label}</span>
      </div>
      <ul className="grid grid-cols-6 gap-x-2 gap-y-1" aria-label="Needs">
        {NEED_KEYS.map((k) => {
          const v = sim.needs[k];
          return (
            <li key={k} className="min-w-0 text-[11px] leading-tight">
              <div className="flex items-center justify-between gap-1">
                <span aria-hidden>{NEED_META[k].icon}</span>
                <span className="truncate text-muted">{NEED_META[k].label}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-label={NEED_META[k].label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full" style={{ width: `${v}%`, background: v < 20 ? "#F59E9E" : NEED_META[k].color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
