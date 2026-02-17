"use client";

import React, { useMemo, useState } from "react";
import { deletePallet, getPallets, type PalletItem, type PalletType } from "../lib/storage";

const PALLET_TYPES: PalletType[] = ["EUR/EPAL", "CHEP", "LPR", "IFCO", "CP", "ALTRO"];

export default function PalletsPage() {
  const [list, setList] = useState<PalletItem[]>(() => getPallets());
  const [q, setQ] = useState("");

  const styles = useMemo(() => {
    const btn = (bg: string) =>
      ({
        padding: "10px 12px",
        borderRadius: 12,
        border: "none",
        fontWeight: 900,
        cursor: "pointer",
        background: bg,
        color: "white",
      } as const);

    return { btn };
  }, []);

  function reload() {
    setList(getPallets());
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((p) => p.code.toLowerCase().includes(s) || (p.locationLabel ?? "").toLowerCase().includes(s));
  }, [list, q]);

  function edit(p: PalletItem) {
    // edit semplice via prompt (stabile)
    const newType = (prompt("Tipo pedana (EUR/EPAL/CHEP/LPR/IFCO/CP/ALTRO):", p.type) ?? p.type).trim() as PalletType;
    const finalType = PALLET_TYPES.includes(newType) ? newType : p.type;

    const qtyStr = (prompt("Quantità:", String(p.qty)) ?? String(p.qty)).trim();
    const newQty = Number(qtyStr);
    const finalQty = Number.isFinite(newQty) && newQty > 0 ? Math.floor(newQty) : p.qty;

    const newAlt = (prompt("Codice alternativo (opz.):", p.altCode ?? "") ?? (p.altCode ?? "")).trim();
    const newNotes = (prompt("Note (opz.):", p.notes ?? "") ?? (p.notes ?? "")).trim();

    // aggiorno ri-salvando tramite local list (usiamo storage setPallets)
    const all = getPallets().map((x) =>
      x.id === p.id ? { ...x, type: finalType, qty: finalQty, altCode: newAlt || undefined, notes: newNotes || undefined, updatedAt: Date.now() } : x
    );

    // setPallets non è esportato qui: faccio trick import inline
    import("../lib/storage").then(({ setPallets }) => {
      setPallets(all);
      reload();
    });
  }

  function del(id: string) {
    if (!confirm("Eliminare pedana dal registro?")) return;
    deletePallet(id);
    reload();
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>🧱 Registro Pedane</h1>
      <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/" style={{ color: "#1e88e5", fontWeight: 800, textDecoration: "none" }}>← Home</a>
        <a href="/scan" style={{ color: "#0b1220", fontWeight: 900, textDecoration: "none" }}>📷 Vai a Scansione</a>
      </div>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🔎 Cerca</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per codice o posizione..."
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd", fontSize: 16 }}
        />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessuna pedana trovata.</div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} style={{ padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 1000, fontSize: 18 }}>{p.code}</div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    Tipo: <b>{p.type}</b> · Qty: <b>{p.qty}</b>
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    Posizione: <b>{p.locationLabel ?? "—"}</b> ({p.locationKind})
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                    GPS: {p.lat ?? "—"} / {p.lng ?? "—"}
                  </div>
                  {p.altCode ? <div style={{ marginTop: 6 }}>Alt: <b>{p.altCode}</b></div> : null}
                  {p.notes ? <div style={{ marginTop: 6 }}>{p.notes}</div> : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                  <button onClick={() => edit(p)} style={styles.btn("#1e88e5")}>Modifica</button>
                  <button onClick={() => del(p.id)} style={styles.btn("#e53935")}>Elimina</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
