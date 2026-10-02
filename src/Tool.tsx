// Queuebird: a walk-in queue for barbers and food trucks. Customers wander off and get a WhatsApp ping when they are close.
import { useEffect, useState } from "react";
import { waLink } from "./lib/share";
import { uid, useStored } from "./lib/store";
import { Section, Stat, Stats } from "./ui/kit";

const T = "queuebird";
type Guest = { id: string; no: number; name: string; phone: string; service: string; joined: number; called?: number; notified?: number; done?: number; left?: boolean };

export default function Queuebird() {
  const [shop, setShop] = useStored(T, "shop", "Fade Street Barbers");
  const [services, setServices] = useStored(T, "services", "Haircut:25, Beard trim:15, Cut and beard:35");
  const [queue, setQueue] = useStored<Guest[]>(T, "queue", []);
  const [nextNo, setNextNo] = useStored(T, "next", 1);
  const [chairs, setChairs] = useStored(T, "chairs", 2);
  const [warnAt, setWarnAt] = useStored(T, "warnAt", 2);
  const [cc, setCc] = useStored(T, "cc", "216");
  const [draft, setDraft] = useState({ name: "", phone: "", service: "" });
  const [display, setDisplay] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(id); }, []);

  const svc = services.split(",").map(s => { const [n, m] = s.split(":"); return { name: n.trim(), min: parseInt(m) || 20 }; }).filter(s => s.name);
  const minsFor = (g: Guest) => svc.find(s => s.name === g.service)?.min ?? svc[0]?.min ?? 20;
  const waiting = queue.filter(g => !g.called && !g.left);
  const serving = queue.filter(g => g.called && !g.done && !g.left);
  const done = queue.filter(g => g.done);
  const avgService = done.length ? done.reduce((a, g) => a + (g.done! - g.called!) / 60000, 0) / done.length : null;
  // Estimated wait: work ahead of this person, shared across chairs.
  const eta = (i: number) => Math.round(waiting.slice(0, i).reduce((a, g) => a + (avgService ?? minsFor(g)), 0) / Math.max(1, chairs) + (serving.length >= chairs ? (avgService ?? 15) / 2 : 0));
  const phoneFull = (p: string) => { const d = p.replace(/\D/g, ""); return d.startsWith(cc) || d.length > 9 ? d : cc + d; };
  const msg = (g: Guest, pos: number) => pos === 0 ? `Hi ${g.name}, it's your turn at ${shop}! Please come back now. Ticket ${g.no}.` : `Hi ${g.name}, you are number ${pos + 1} in line at ${shop} (ticket ${g.no}). About ${eta(pos)} minutes to go, please head back soon.`;
  const set = (id: string, p: Partial<Guest>) => setQueue(q => q.map(g => (g.id === id ? { ...g, ...p } : g)));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setQueue([...queue, { id: uid(), no: nextNo, name: draft.name.trim(), phone: draft.phone, service: draft.service || svc[0]?.name || "", joined: Date.now() }]);
    setNextNo(nextNo + 1);
    setDraft({ name: "", phone: "", service: draft.service });
  };

  if (display) return (
    <div className="qb-display" onClick={() => setDisplay(false)}>
      <p className="qb-shop">{shop}</p>
      <div className="qb-now"><span>Now serving</span><strong>{serving.map(g => g.no).join("  ") || "–"}</strong></div>
      <div className="qb-next"><span>Next</span>{waiting.slice(0, 6).map((g, i) => <b key={g.id}>{g.no}<em>~{eta(i)} min</em></b>)}</div>
      <p className="qb-hint">Tap to leave the display</p>
      <style>{css}</style>
    </div>
  );

  return (
    <div className="stack">
      <Section title={shop} aside={<button className="btn" onClick={() => setDisplay(true)}>Show on a TV</button>}>
        <Stats><Stat value={waiting.length} label="Waiting" /><Stat value={serving.length} label="In the chair" /><Stat value={waiting.length ? `${eta(waiting.length)} min` : "0 min"} label="Wait for a new walk-in" /><Stat value={done.length} label="Served today" /><Stat value={avgService ? `${Math.round(avgService)} min` : "–"} label="Average service" /></Stats>
      </Section>

      <div className="grid2">
        <Section title="Add a walk-in">
          <form className="stack" style={{ gap: 10 }} onSubmit={add}>
            <div className="row">
              <label className="field"><span>Name</span><input id="qb-name" className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
              <label className="field"><span>WhatsApp number</span><input id="qb-phone" className="input" inputMode="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} placeholder="22 123 456" /></label>
            </div>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <label className="field"><span>Service</span><select id="qb-svc" className="input" value={draft.service} onChange={e => setDraft({ ...draft, service: e.target.value })}>{svc.map(s => <option key={s.name} value={s.name}>{s.name} ({s.min} min)</option>)}</select></label>
              <button className="btn primary" type="submit">Give ticket {nextNo}</button>
            </div>
          </form>
        </Section>
        <Section title="Settings">
          <div className="stack" style={{ gap: 10 }}>
            <label className="field"><span>Shop name</span><input id="qb-shop" className="input" value={shop} onChange={e => setShop(e.target.value)} /></label>
            <label className="field"><span>Services and minutes</span><input id="qb-services" className="input" value={services} onChange={e => setServices(e.target.value)} /></label>
            <div className="row">
              <label className="field"><span>Chairs</span><input id="qb-chairs" type="number" min={1} className="input num" value={chairs} onChange={e => setChairs(Math.max(1, +e.target.value || 1))} /></label>
              <label className="field"><span>Ping when this close</span><input id="qb-warn" type="number" min={1} className="input num" value={warnAt} onChange={e => setWarnAt(Math.max(1, +e.target.value || 1))} /></label>
              <label className="field"><span>Country code</span><input id="qb-cc" className="input num" value={cc} onChange={e => setCc(e.target.value.replace(/\D/g, ""))} /></label>
            </div>
            <button className="btn ghost small danger" style={{ alignSelf: "flex-start" }} onClick={() => { setQueue([]); setNextNo(1); }}>Start a new day</button>
          </div>
        </Section>
      </div>

      <Section title="In the chair">
        {serving.length === 0 ? <p className="empty-note">Nobody yet. Call the next person.</p> : serving.map(g => (
          <div key={g.id} className="qb-row"><span className="qb-no">{g.no}</span><div style={{ flex: 1 }}><strong>{g.name}</strong><p className="note">{g.service} · started {Math.round((Date.now() - g.called!) / 60000)} min ago</p></div>
            <button className="btn primary small" onClick={() => set(g.id, { done: Date.now() })}>Finished</button></div>
        ))}
      </Section>

      <Section title="Waiting" aside={waiting.length > 0 && serving.length < chairs ? <button className="btn primary" onClick={() => set(waiting[0].id, { called: Date.now() })}>Call ticket {waiting[0].no}</button> : null}>
        {waiting.length === 0 ? <p className="empty-note">The queue is empty.</p> : waiting.map((g, i) => {
          const due = i < warnAt && !g.notified && g.phone;
          return (
            <div key={g.id} className="qb-row" style={{ borderLeft: due ? "4px solid var(--warn)" : undefined }}>
              <span className="qb-no">{g.no}</span>
              <div style={{ flex: 1, minWidth: 0 }}><strong>{g.name}</strong> <span className="pill">{g.service}</span>
                <p className="note">Waiting {Math.round((Date.now() - g.joined) / 60000)} min · about {eta(i)} min to go{g.notified ? " · notified" : ""}</p></div>
              <div className="row" style={{ gap: 6 }}>
                {g.phone && <a className={"btn small" + (due ? " primary" : "")} href={waLink(msg(g, i), phoneFull(g.phone))} target="_blank" rel="noreferrer" onClick={() => set(g.id, { notified: Date.now() })}>{i === 0 ? "Tell them it's their turn" : "Send heads-up"}</a>}
                <button className="btn ghost small" onClick={() => set(g.id, { called: Date.now() })}>Call</button>
                <button className="btn ghost small danger" onClick={() => set(g.id, { left: true })}>Left</button>
              </div>
            </div>
          );
        })}
      </Section>
      <style>{css}</style>
    </div>
  );
}

const css = `.qb-row{display:flex;gap:14px;align-items:center;padding:12px 10px;border-bottom:1px solid var(--line);flex-wrap:wrap}.qb-no{font-family:var(--serif);font-size:34px;min-width:52px;text-align:center}
.qb-display{position:fixed;inset:0;z-index:50;background:#0B0D18;color:#EDEFF7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vh;cursor:pointer;padding:4vw}
.qb-shop{font-family:var(--serif);font-size:5vh}.qb-now{text-align:center}.qb-now span,.qb-next>span{display:block;font-family:var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#8FA6FF;font-size:2.4vh}
.qb-now strong{font-family:var(--serif);font-weight:400;font-size:24vh;line-height:1;color:#FFE800}.qb-next{display:flex;flex-wrap:wrap;gap:4vw;align-items:flex-end;justify-content:center}.qb-next b{font-family:var(--serif);font-weight:400;font-size:9vh;display:flex;flex-direction:column;align-items:center}
.qb-next em{font-family:var(--mono);font-style:normal;font-size:2vh;color:#A0A6C0}.qb-hint{font-size:1.6vh;color:#5d6380}`;
