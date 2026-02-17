"use client";

import React, { useMemo, useState } from "react";
import { uid } from "../lib/storage";

type Missing = { id: string; code: string; note?: string; ts: number; resolved: boolean };
const KEY = "pt_missing_v1";

function load(): Missing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Missing[];
  } catch {
    return [];
  }
}
function save(list: Missing[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export default function MissingPage() {
  const [list, setList] = useState<Missing[]>(() => load());
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");

  const open = useMemo(() => list.filter((x) => !x.resolved), [list]);
  const done = useMemo(() => list.filter((x) => x.resolved), [list]);

  function add() {
    const c = code.trim();
    if (!c) return alert("Inserisci un codice.");
    const next: Missing[] = [{ id: uid("miss"), code: c, note: note.trim() || undefined, ts: Date.now(), resolved: false }, ...list];
    save(next);
    setList(next);
    setCode("");
    setNote("");
  }

  function toggle(id: string, resolved: boolean) {
    const next = list.map((x) => (x.id === id ? { ...x, resolved } : x));
    save(next);
    setList(next);
  }

  function del(id: string) {
    const next = list.filter((x) => x.id !== id);
    save(next);
    setList(next);
  }

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚨 Pedane Mancanti</h1>
      <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>← Home</a>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Segna mancante</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input style={inp()} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Codice pedana" />
          <input style={inp()} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opz.)" />
          <button style={btn("#e53935")} onClick={add}>Aggiungi</button>
        </div>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Aperte</div>
        {open.length === 0 ? <div style={{ opacity: 0.7 }}>Nessuna mancante.</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {open.map((x) => (
            <div key={x.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{x.code}</div>
              <div style={{ opacity: 0.85 }}>{x.note || "—"}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn("#2e7d32")} onClick={() => toggle(x.id, true)}>Risolta</button>
                <button style={btn("#455a64")} onClick={() => del(x.id)}>Elimina</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={box()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Risolte</div>
        {done.length === 0 ? <div style={{ opacity: 0.7 }}>Nessuna risolta.</div> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {done.map((x) => (
            <div key={x.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{x.code}</div>
              <div style={{ opacity: 0.85 }}>{x.note || "—"}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn("#fb8c00")} onClick={() => toggle(x.id, false)}>Riapri</button>
                <button style={btn("#455a64")} onClick={() => del(x.id)}>Elimina</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const box = (): React.CSSProperties => ({ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white" });
const inp = (): React.CSSProperties => ({ padding: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16, width: "100%" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const card = (): React.CSSProperties => ({ padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white", display: "grid", gap: 8 });
