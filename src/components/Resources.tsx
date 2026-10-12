import { EMERGENCY, RESOURCES, RESOURCES_VERIFIED, type Resource } from "@/data/resources";

function Row({ r, big, H }: { r: Resource; big?: boolean; H: "h2" | "h3" }) {
  return (
    <li className={`rounded-2xl border border-line bg-surface-2 p-4 ${big ? "ring-2 ring-softred/60" : ""}`}>
      <H className="font-display text-lg font-semibold">{r.name}</H>
      <p className="text-sm text-muted">{r.who}</p>
      <p className="mt-1 text-sm">
        <span className="text-muted">Hours:</span> {r.hours} · <span className="text-muted">Languages:</span> {r.languages}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {r.call && <a className="btn" href={`tel:${r.call.tel}`}>{r.call.label}</a>}
        {r.text && <a className="btn ghost" href={`sms:${r.text.sms}${r.text.body ? `?body=${encodeURIComponent(r.text.body)}` : ""}`}>{r.text.label}</a>}
        {r.web && <a className="btn ghost" href={r.web.url} target="_blank" rel="noopener noreferrer">{r.web.label}</a>}
      </div>
      {r.note && <p className="mt-2 text-sm text-muted">{r.note}</p>}
      {!r.verified && <p className="mt-1 text-xs text-muted">Not independently checked. Please confirm for your area.</p>}
    </li>
  );
}

/** Plain, server-renderable list so help is available even if scripts fail to load. */
export function ResourceList({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  return (
    <div>
      <ul className="grid gap-3">
        <Row r={EMERGENCY} big H={headingLevel} />
        {RESOURCES.map((r) => <Row key={r.id} r={r} H={headingLevel} />)}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Numbers last checked {RESOURCES_VERIFIED}. This app is not a crisis service, a medical service or therapy. Calls to 9-8-8 and 911 are free.
      </p>
    </div>
  );
}
