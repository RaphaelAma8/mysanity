"use client";

import { useState } from "react";
import { Hud } from "@/components/Hud";
import { Loading, TopNav } from "@/components/Parts";
import { ResultNote } from "@/components/Result";
import { useHaven, useRequireProfile } from "@/components/HavenProvider";
import { REGIONS, regionById } from "@/data/regions";
import { ADOPT_PRICE, GROCERY_PACK, JOBS, PET_FOOD_PACK, PLACES, SHOP_ITEMS, TRAVEL_PRICE, itemById } from "@/lib/sim/data";
import { adoptCat, buy, buyGroceries, buyPetFood, centreChat, centreMeal, parkWalk, travel, visit, weatherFor, work } from "@/lib/sim/engine";
import { BLOCKS_PER_DAY, MAX_SHIFTS_PER_DAY, type Result, type Sim } from "@/lib/sim/types";
import { run } from "@/lib/game";

export default function Town() {
  const ok = useRequireProfile();
  const { state } = useHaven();
  const [at, setAt] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [name, setName] = useState("");
  const [arrived, setArrived] = useState<string | null>(null);
  const sim = state.sim;
  if (!ok || !sim || !state.region) return <Loading />;
  const region = state.region;
  const place = PLACES.find((p) => p.id === at) ?? null;
  const late = sim.block >= BLOCKS_PER_DAY;
  const doit = (fn: (s: Sim) => Result) => { const r = run(fn); if (r) setRes(r); return r; };

  const go = (id: string) => {
    setArrived(null);
    const r = doit((s) => visit(s, id));
    if (r?.ok) setAt(id);
  };

  return (
    <div>
      <TopNav />
      <Hud sim={sim} weather={weatherFor(sim, region)} />
      <h1 className="font-display text-3xl font-semibold">Town</h1>
      <p className="mb-3 mt-1 text-muted">Going somewhere takes one time block the first time each day. Everything here is optional, and the prices never change.</p>
      <div className="mb-3"><ResultNote r={res} /></div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Places">
        {PLACES.map((p) => (
          <li key={p.id}>
            <button className={`card flex h-full w-full flex-col items-start gap-1 text-left hover:bg-surface-2 ${at === p.id ? "ring-2 ring-lantern" : ""}`} onClick={() => (sim.visitedToday.includes(p.id) || p.kind === "job" || p.id === "travel" ? (setArrived(null), setAt(p.id)) : go(p.id))} aria-pressed={at === p.id}>
              <span className="text-2xl" aria-hidden>{p.icon}</span>
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm text-muted">{p.blurb}</span>
              {!sim.visitedToday.includes(p.id) && p.kind !== "job" && p.id !== "travel" && <span className="text-xs text-lantern">{late ? "Too late today" : "Takes 1 block"}</span>}
            </button>
          </li>
        ))}
      </ul>

      {place && (
        <section className="card mt-4" aria-label={place.name}>
          <h2 className="font-display text-2xl font-semibold"><span aria-hidden>{place.icon}</span> {place.name}</h2>

          {place.id === "grocery" && (
            <div className="mt-3 grid gap-2">
              <p className="text-sm text-muted">You have {sim.groceries} meals of groceries{sim.pet ? ` and ${sim.petFood} servings of pet food` : ""}.</p>
              <button className="act" disabled={sim.money < GROCERY_PACK.price} onClick={() => doit(buyGroceries)}><span aria-hidden>🥦</span><span><b>Groceries for the week</b><small>{GROCERY_PACK.units} home-cooked meals · ${GROCERY_PACK.price}</small></span></button>
              <button className="act" disabled={sim.money < PET_FOOD_PACK.price} onClick={() => doit(buyPetFood)}><span aria-hidden>🐟</span><span><b>Pet food</b><small>{PET_FOOD_PACK.units} servings · ${PET_FOOD_PACK.price}</small></span></button>
            </div>
          )}

          {SHOP_ITEMS[place.id] && (
            <ul className="mt-3 grid gap-2">
              {SHOP_ITEMS[place.id].map((id) => {
                const it = itemById(id)!;
                const own = sim.inventory.includes(id);
                return (
                  <li key={id}>
                    <button className="act" disabled={own || sim.money < it.price} onClick={() => doit((s) => buy(s, id))}>
                      <span aria-hidden>{it.icon}</span>
                      <span><b>{it.name}</b><small>{own ? "You have this" : `$${it.price} · ${it.blurb}`}{!own && sim.money < it.price ? " · saving up is fine" : ""}</small></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {place.id === "work" && (
            <div className="mt-3 grid gap-2">
              <p className="text-sm text-muted">Shifts today: {sim.shiftsToday} of {MAX_SHIFTS_PER_DAY}. Two is plenty. Rest counts too.</p>
              {JOBS.map((j) => (
                <button key={j.id} className="act" onClick={() => doit((s) => work(s, j.id))}>
                  <span aria-hidden>{j.icon}</span>
                  <span><b>{j.name} · ${j.pay}</b><small>{j.blurb} Takes {j.blocks} blocks.</small></span>
                </button>
              ))}
            </div>
          )}

          {place.id === "park" && (
            <div className="mt-3"><button className="act" onClick={() => doit((s) => parkWalk(s, region))}><span aria-hidden>🚶</span><span><b>Take a walk</b><small>Free · +Calm, +Fun · takes 1 block</small></span></button></div>
          )}

          {place.id === "centre" && (
            <div className="mt-3 grid gap-2">
              <p className="text-sm text-muted">Asking for help is a skill, and people here are glad to give it.</p>
              <button className="act" disabled={sim.helpedToday} onClick={() => doit(centreMeal)}><span aria-hidden>🍲</span><span><b>Have a free meal</b><small>{sim.helpedToday ? "You've had a meal here today" : "Free · +Fed, +Connected · takes 1 block"}</small></span></button>
              <button className="act" onClick={() => doit(centreChat)}><span aria-hidden>💬</span><span><b>Sit and chat with someone</b><small>Free · +Connected · you might meet a friend · takes 1 block</small></span></button>
            </div>
          )}

          {place.id === "shelter" && (
            <div className="mt-3 grid gap-2">
              {sim.pet ? <p>{sim.pet.name} is happy at home with you.</p> : (
                <>
                  <label htmlFor="cat" className="font-semibold">Name your new cat</label>
                  <input id="cat" value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="Miso" className="rounded-2xl border border-line bg-surface p-3 text-lg text-ink" />
                  <button className="btn" disabled={sim.money < ADOPT_PRICE} onClick={() => doit((s) => adoptCat(s, name))}>Adopt · ${ADOPT_PRICE}</button>
                  <p className="text-sm text-muted">Cats are low-maintenance and never get sick or leave. They just keep you company.</p>
                </>
              )}
            </div>
          )}

          {place.id === "travel" && (
            <div className="mt-3 grid gap-2">
              <p className="text-sm text-muted">A trip costs ${TRAVEL_PRICE} and two time blocks. You come home the same day, calmer and with a postcard.</p>
              {arrived && (
                <div className="rounded-2xl bg-surface-2 p-4"><p className="font-display text-lg font-semibold">Postcards from {regionById(arrived)?.name}</p>
                  {regionById(arrived)?.postcards.map((p, i) => <p key={i} className="mt-2">{p}</p>)}
                  <p className="mt-3 text-sm"><strong>A small practice:</strong> {regionById(arrived)?.practice}</p></div>
              )}
              <ul className="grid gap-2 sm:grid-cols-2">
                {REGIONS.map((r) => (
                  <li key={r.id}>
                    <button className="act" disabled={sim.money < TRAVEL_PRICE || late} onClick={() => { const x = doit((s) => travel(s, r.id, r.name)); if (x?.ok) setArrived(r.id); }}>
                      <span aria-hidden>✈️</span><span><b>{r.name}</b><small>{sim.travelled.includes(r.id) ? "Visited · " : ""}${TRAVEL_PRICE}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
