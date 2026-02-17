"use client";

import React, { useMemo, useState } from "react";
import { formatDT, getPallets } from "../lib/storage";

export default function MissingPage() {
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(0);

  const list = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return getPallets()
      .filter((p) => (p.lastSeenTs ?? 0) < cutoff)
      .sort((a, b) => (a.lastSeenTs ?? 0) - (b.lastSeenTs ?? 0));
  }, [days, refresh]);

  return (
    <div style={{ padding: 16, maxWidth: 1050, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚨 Pedane Mancanti</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <a href="/" style={link()}>← Home</a>
        <button style={btn("#455a64")} onClick={() => setRefresh((x) => x + 1)}>Aggiorna</button>
        <div style={{ fontWeight: 900 }}>Soglia giorni:</div>
        <input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Math.max(1, parseInt(e.target.value || "7", 10)))}
          style={input()}
        />
      </div>

      <div style={box()}>
        {list.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Nessuna pedana “mancante” con soglia {days} giorni.</div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {list.map((p) => (
            <div key={p.id} style={card()}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{p.code}</div>
              <div style={{ opacity: 0.85 }}>
                Ultimo visto: {p.lastSeenTs ? formatDT(p.lastSeenTs) : "—"} • Tipo: {p.palletType || "—"}
              </div>
              <div style={{ opacity: 0.85 }}>
                Ultima posizione: {p.locationKind || "—"} {p.locationId ? `(${p.locationId})` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const box = (): React.CSSProperties => ({ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #eee", background: "white" });
const card = (): React.CSSProperties => ({ padding: 14, borderRadius: 14, border: "1px solid #eee", background: "#fafafa" });
const btn = (bg: string): React.CSSProperties => ({ padding: "12px 14px", borderRadius: 12, border: "none", background: bg, color: "white", fontWeight: 900, cursor: "pointer" });
const link = (): React.CSSProperties => ({ fontWeight: 900, textDecoration: "none", color: "#1e88e5", padding: "12px 0" });
const input = (): React.CSSProperties => ({ padding: 10, borderRadius: 12, border: "1px solid #ddd", width: 120 });
