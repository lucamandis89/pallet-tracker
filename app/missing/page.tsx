"use client";

import React, { useMemo, useState } from "react";
import { addMissing, getMissing, removeMissing, resolveMissing, type MissingItem } from "../lib/storage";

export default function MissingPage() {
  const [list, setList] = useState<MissingItem[]>(() => getMissing());
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");

  const styles = useMemo(() => {
    const input = {
      width: "100%",
      padding: 12,
      borderRadius: 12,
      border: "1px solid #ddd",
      fontSize: 16,
      outline: "none",
    } as const;

    const btn = (bg: string) =>
      ({
        padding: "12px 14px",
        borderRadius: 12,
        border: "none",
        fontWeight: 900,
        cursor: "pointer",
        background: bg,
        color: "white",
      } as const);

    return { input, btn };
  }, []);

  function reload() {
    setList(getMissing());
  }

  function add() {
    const c = code.trim();
    if (!c) return alert("Inserisci il codice pedana mancante.");
    addMissing({
      palletCode: c,
      reason: reason.trim() || undefined,
    });
    setCode("");
    setReason("");
    reload();
  }

  function toggle(m: MissingItem) {
    resolveMissing(m.id, !(m.resolved === true));
    reload();
  }

  function del(id: string) {
    if (!confirm("Eliminare dalla lista mancanti?")) return;
    removeMissing(id);
    reload();
  }

  const open = list.filter((x) => !x.resolved);
  const closed = list.filter((x) => x.resolved);

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>🚨 Pedane Mancanti</h1>
      <div style={{ marginTop: 10 }}>
        <a href="/" style={{ color: "#1e88e5", fontWeight: 800, textDecoration: "none" }}>
          ← Home
        </a>
      </div>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Segnala pedana mancante</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Codice pedana (es. PEDANA-000123)" style={styles.input} />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opz.)" style={styles.input} />
          <button onClick={add} style={styles.btn("#e53935")}>+ Aggiungi mancante</button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 1000, fontSize: 18 }}>Aperte: {open.length}</div>

        {open.map((m) => (
          <div key={m.id} style={{ padding: 14, borderRadius: 16, border: "1px solid #e6e6e6", background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18 }}>{m.palletCode}</div>
                <div style={{ opacity: 0.85 }}>{m.reason || "—"}</div>
                <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                  Inserita: {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 150 }}>
                <button onClick={() => toggle(m)} style={styles.btn("#2e7d32")}>Segna risolta</button>
                <button onClick={() => del(m.id)} style={styles.btn("#616161")}>Elimina</button>
              </div>
            </div>
          </div>
        ))}

        <div style={{ fontWeight: 1000, fontSize: 18, marginTop: 8 }}>Risolte: {closed.length}</div>

        {closed.map((m) => (
          <div key={m.id} style={{ padding: 14, borderRadius: 16, border: "1px solid #f0f0f0", background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18 }}>{m.palletCode} ✅</div>
                <div style={{ opacity: 0.85 }}>{m.reason || "—"}</div>
                <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                  Risolta: {m.resolvedAt ? new Date(m.resolvedAt).toLocaleString() : "—"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 150 }}>
                <button onClick={() => toggle(m)} style={styles.btn("#0b1220")}>Riapri</button>
                <button onClick={() => del(m.id)} style={styles.btn("#616161")}>Elimina</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
