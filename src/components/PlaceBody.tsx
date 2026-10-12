"use client";

import { useState } from "react";
import { ResultNote } from "@/components/Result";
import { REGIONS, regionById } from "@/data/regions";
import { run } from "@/lib/game";
import { moderatePetName } from "@/lib/social/guard";
import { ADOPT_PRICE, GROCERY_PACK, JOBS, PET_FOOD_PACK, SHOP_ITEMS, TRAVEL_PRICE, itemById } from "@/lib/sim/data";
import { adoptCat, buy, buyGroceries, buyPetFood, centreChat, centreMeal, parkWalk, placeOuting, travel, work } from "@/lib/sim/engine";
import { BLOCKS_PER_DAY, MAX_SHIFTS_PER_DAY, type Result, type Sim } from "@/lib/sim/types";
import { CrisisNotice } from "@/components/Parts";

/** What you can do once you are somewhere. Shared by the town list and the walkable world. */
export function PlaceBody({ placeId, onlyJob, sim, region }: { placeId: string; onlyJob?: string; sim: Sim; region: string }) {
  const [res, setRes] = useState<Result | null>(null);
  const [name, setName] = useState("");
  const [arrived, setArrived] = useState<string | null>(null);
  const [nameConcern, setNameConcern] = useState(false);
  const late = sim.block >= BLOCKS_PER_DAY;
  const doit = (fn: (s: Sim) => Result) => {
    const r = run(fn);
    if (r) setRes(r);
    return r;
  };
  const jobs = JOBS.filter((j) => !onlyJob || j.id === onlyJob);

  return (
    <div>
      <div className="mb-3"><ResultNote r={res} /></div>
      {placeId === "grocery" && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">You have {sim.groceries} meals of groceries{sim.pet ? ` and ${sim.petFood} servings of pet food` : ""}.</p>
          <button className="act" disabled={sim.money < GROCERY_PACK.price} onClick={() => doit(buyGroceries)}><span aria-hidden>🥦</span><span><b>Groceries for the week</b><small>{GROCERY_PACK.units} home-cooked meals · ${GROCERY_PACK.price}</small></span></button>
          <button className="act" disabled={sim.money < PET_FOOD_PACK.price} onClick={() => doit(buyPetFood)}><span aria-hidden>🐟</span><span><b>Pet food</b><small>{PET_FOOD_PACK.units} servings · ${PET_FOOD_PACK.price}</small></span></button>
        </div>
      )}

      {SHOP_ITEMS[placeId] && (
        <ul className="grid gap-2">
          {SHOP_ITEMS[placeId].map((id) => {
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

      {(placeId === "work" || onlyJob) && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Shifts today: {sim.shiftsToday} of {MAX_SHIFTS_PER_DAY}. Two is plenty. Rest counts too.</p>
          {jobs.map((j) => (
            <button key={j.id} className="act" onClick={() => doit((s) => work(s, j.id))}>
              <span aria-hidden>{j.icon}</span>
              <span><b>{j.name} · ${j.pay}</b><small>{j.blurb} Takes {j.blocks} blocks.</small></span>
            </button>
          ))}
        </div>
      )}

      {placeId === "club" && (
        <button className="act" onClick={() => doit((s) => placeOuting(s, "club"))}><span aria-hidden>🎶</span><span><b>Sit in with people</b><small>Free · other players in this room are visible if you have joined the town · takes 1 block</small></span></button>
      )}
      {placeId === "gym" && (
        <button className="act" onClick={() => doit((s) => placeOuting(s, "gym"))}><span aria-hidden>🤸</span><span><b>Move a little</b><small>Free · stop whenever you like · takes 1 block</small></span></button>
      )}
      {placeId === "farm" && (
        <button className="act" onClick={() => doit((s) => placeOuting(s, "farm"))}><span aria-hidden>🌾</span><span><b>Walk the rows</b><small>Free · quiet, and nobody times you · takes 1 block</small></span></button>
      )}
      {placeId === "bank" && (
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="font-display text-2xl font-semibold">${sim.money.toLocaleString("en-CA")}</p>
          <p className="mt-1 text-sm text-muted">Game dollars on hand. This window is not a real bank. Nothing is borrowed, and nothing is taken away.</p>
        </div>
      )}

      {placeId === "park" && (
        <button className="act" onClick={() => doit((s) => parkWalk(s, region))}><span aria-hidden>🚶</span><span><b>Take a walk</b><small>Free · +Calm, +Fun · takes 1 block</small></span></button>
      )}

      {placeId === "centre" && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Asking for help is a skill, and people here are glad to give it.</p>
          <button className="act" disabled={sim.helpedToday} onClick={() => doit(centreMeal)}><span aria-hidden>🍲</span><span><b>Have a free meal</b><small>{sim.helpedToday ? "You've had a meal here today" : "Free · +Fed, +Connected · takes 1 block"}</small></span></button>
          <button className="act" onClick={() => doit(centreChat)}><span aria-hidden>💬</span><span><b>Sit and chat with someone</b><small>Free · +Connected · you might meet a friend · takes 1 block</small></span></button>
        </div>
      )}

      {placeId === "shelter" && (
        <div className="grid gap-2">
          {sim.pet ? <p>{sim.pet.name} is happy at home with you.</p> : (
            <>
              <label htmlFor="cat" className="font-semibold">Name your new cat</label>
              <input id="cat" value={name} onChange={(e) => { setName(e.target.value.slice(0, 20)); setNameConcern(false); }} placeholder="Miso" className="rounded-2xl border border-line bg-surface p-3 text-lg text-ink" />
              {nameConcern && <CrisisNotice />}
              <button className="btn" disabled={sim.money < ADOPT_PRICE} onClick={() => {
                const checked = moderatePetName(name);
                if (!checked.ok) { setNameConcern(true); setRes({ sim, ok: false, message: checked.reason }); return; }
                doit((s) => adoptCat(s, checked.name));
              }}>Adopt · ${ADOPT_PRICE}</button>
              <p className="text-sm text-muted">Cats are low-maintenance and never get sick or leave. They just keep you company.</p>
            </>
          )}
        </div>
      )}

      {placeId === "travel" && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">A trip costs ${TRAVEL_PRICE} and two time blocks. You come home the same day, calmer and with a postcard. Game money only.</p>
          {arrived && (
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="font-display text-lg font-semibold">Postcards from {regionById(arrived)?.name}</p>
              {regionById(arrived)?.postcards.map((p, i) => <p key={i} className="mt-2">{p}</p>)}
              <p className="mt-3 text-sm"><strong>A small practice:</strong> {regionById(arrived)?.practice}</p>
            </div>
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
    </div>
  );
}
