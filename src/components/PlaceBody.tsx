"use client";

import { useState } from "react";
import { ClubFloor } from "@/components/ClubFloor";
import { ResultNote } from "@/components/Result";
import { REGIONS, regionById } from "@/data/regions";
import { run } from "@/lib/game";
import { moderatePetName } from "@/lib/social/guard";
import { ADOPT_PRICE, CARS, GROCERY_PACK, JOBS, PET_FOOD_PACK, SHOP_ITEMS, TRAVEL_PRICE, businessForPlace, homeById, itemById } from "@/lib/sim/data";
import { adoptCat, buy, buyBusiness, buyCar, buyGroceries, buyHome, buyPetFood, centreChat, centreMeal, parkWalk, placeOuting, setBusinessBoard, travel, work } from "@/lib/sim/engine";
import { BLOCKS_PER_DAY, MAX_SHIFTS_PER_DAY, type Result, type Sim } from "@/lib/sim/types";
import { CrisisNotice } from "@/components/Parts";

/** What you can do once you are somewhere. Shared by the town list and the walkable world. */
export function PlaceBody({ placeId, onlyJob, homeId, sim, region, onEnterHome }: { placeId: string; onlyJob?: string; homeId?: string; sim: Sim; region: string; onEnterHome?: (homeId: string) => void }) {
  const [res, setRes] = useState<Result | null>(null);
  const [name, setName] = useState("");
  const [boardLine, setBoardLine] = useState(sim.businessBoard?.line ?? "");
  const [arrived, setArrived] = useState<string | null>(null);
  const [nameConcern, setNameConcern] = useState(false);
  const [boardConcern, setBoardConcern] = useState(false);
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

      {placeId === "club" && <ClubFloor sim={sim} onRun={doit} />}
      {placeId === "gym" && (
        <button className="act" onClick={() => doit((s) => placeOuting(s, "gym"))}><span aria-hidden>🤸</span><span><b>Move a little</b><small>Free · stop whenever you like · takes 1 block</small></span></button>
      )}
      {placeId === "farm" && (
        <button className="act" onClick={() => doit((s) => placeOuting(s, "farm"))}><span aria-hidden>🌾</span><span><b>Walk the rows</b><small>Free · quiet, and nobody times you · takes 1 block</small></span></button>
      )}
      {placeId === "lot" && (
        <div className="grid gap-2">
          <p className="text-sm text-muted">Cars stay on the lot at one price. Walking still works if you leave them parked, and nothing you own is taken away.</p>
          {CARS.map((car) => {
            const owned = sim.cars.includes(car.id);
            return (
              <button key={car.id} className="act" disabled={owned || sim.money < car.price} onClick={() => doit((s) => buyCar(s, car.id))}>
                <span aria-hidden>🚗</span>
                <span><b>{owned ? `${car.name} is yours` : `${car.name} · $${car.price}`}</b><small>{owned ? "Drive it from the street, or leave it in the garage." : `${car.blurb} Speed ${car.speed} · ${car.seats} seats.`}</small></span>
              </button>
            );
          })}
        </div>
      )}

      {placeId === "homes" && homeId && (
        <HomeOffer homeId={homeId} sim={sim} onBuy={(id) => { const r = doit((s) => buyHome(s, id)); if (r?.ok) onEnterHome?.(id); }} onEnter={onEnterHome} />
      )}

      {(businessForPlace(placeId) || onlyJob === "cafe") && (
        <ShopOffer placeId={onlyJob === "cafe" ? "cafe" : placeId} sim={sim} line={boardLine} setLine={setBoardLine} concern={boardConcern} setConcern={setBoardConcern} doit={doit} />
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

function HomeOffer({ homeId, sim, onBuy, onEnter }: { homeId: string; sim: Sim; onBuy: (id: string) => void; onEnter?: (id: string) => void }) {
  const home = homeById(homeId);
  if (!home) return null;
  const owned = sim.homes.includes(homeId);
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">{home.blurb} Look inside to arrange furniture. It stays where you put it.</p>
      {owned ? (
        <button className="btn" onClick={() => onEnter?.(homeId)}>Look inside</button>
      ) : (
        <button className="act" disabled={sim.money < home.price} onClick={() => onBuy(homeId)}>
          <span aria-hidden>🏠</span>
          <span><b>Make {home.name} yours · ${home.price}</b><small>One price. It is never taken away, even if money is tight later.</small></span>
        </button>
      )}
    </div>
  );
}

function ShopOffer({ placeId, sim, line, setLine, concern, setConcern, doit }: {
  placeId: string;
  sim: Sim;
  line: string;
  setLine: (value: string) => void;
  concern: boolean;
  setConcern: (value: boolean) => void;
  doit: (fn: (s: Sim) => Result) => Result | null | undefined;
}) {
  const shop = businessForPlace(placeId);
  if (!shop) return null;
  const owned = sim.businesses.includes(shop.id);
  const price = shop.rent * 4;
  return (
    <div className="mt-3 grid gap-2 rounded-2xl bg-surface-2 p-3">
      {owned ? (
        <>
          <p className="font-semibold">{shop.name} is yours</p>
          <p className="text-sm text-muted">Weekly rent is ${shop.rent}. If money is short, the community covers it. That is not a failure, and the shop stays yours.</p>
          <label htmlFor="board-line" className="font-semibold">A line for the street board</label>
          <input id="board-line" value={line} onChange={(e) => { setLine(e.target.value.slice(0, 80)); setConcern(false); }} className="rounded-2xl border border-line bg-surface p-3 text-ink" placeholder="Fresh bread on weekday mornings" />
          {concern && <CrisisNotice />}
          <button className="btn" onClick={() => {
            const r = doit((s) => setBusinessBoard(s, shop.name, line));
            if (r && !r.ok && /9-8-8/.test(r.message)) setConcern(true);
            if (r?.ok) {
              void fetch("/api/ads", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ businessName: shop.name, line, detail: "A shop in Cedar Bay.", contact: "", kind: "board" }),
              }).catch(() => undefined);
            }
          }}>Put it on a street board</button>
        </>
      ) : (
        <button className="act" disabled={sim.money < price} onClick={() => doit((s) => buyBusiness(s, shop.id))}>
          <span aria-hidden>🪧</span>
          <span><b>Own {shop.name} · ${price}</b><small>{shop.blurb} Weekly rent ${shop.rent}, covered if you cannot pay.</small></span>
        </button>
      )}
    </div>
  );
}
