"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getPallets, upsertPallet, deletePallet } from "../lib/storage";

type PalletItem = {
  id: string;
  code: string;
  type?: string;
  altCode?: string;
  notes?: string;
  createdTs?: number;
  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastSource?: "qr" | "manual";
};

const PALLET_TYPES = ["EUR / EPAL", "CHEP", "LPR", "IFCO", "DUSS", "ROOL", "Altro"] as const;

function fmtDate(ts?: number) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "-";
  }
}

export default function PalletsPage() {
  const [items, setItems] = useState<PalletItem[]>([]);
  const [q, setQ] = useState("");

  // form (add/edit)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [type, setType] = useState<string>(PALLET_TYPES[0]);
  const [altCode, setAltCode] = useState("");
  const [notes, setNotes] = useState("");

  function reload() {
    const list = (getPallets() || []) as PalletItem[];
    // ordinamento: ultimo visto prima
    list.sort((a, b) => (b.lastSeenTs || 0) - (a.lastSeenTs || 0));
    setItems(list);
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => (p.code || "").toLowerCase().includes(s) || (p.altCode || "").toLowerCase().includes(s));
  }, [items, q]);

  function resetForm() {
    setEditingId(null);
    setCode("");
    setType(PALLET_TYPES[0]);
    setAltCode("");
    setNotes("");
  }

  function openAdd() {
    resetForm();
    setOpen(true);
  }

  function openEdit(p: PalletItem) {
    setEditingId(p.id);
    setCode(p.code || "");
    setType(p.type || PALLET_TYPES[0]);
    setAltCode(p.altCode || "");
    setNotes(p.notes || "");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  function save() {
    const clean = code.trim();
    if (!clean) {
      alert("Inserisci un codice pedana (es: PEDANA-000123).");
      return;
    }

    const now = Date.now();
    const payload: any = {
      // se editingId c’è, teniamo quello, altrimenti crea nuovo
      id: editingId || undefined,
      code: clean,
      type: (type || "").trim() || undefined,
      altCode: altCode.trim() || undefined,
      notes: notes.trim() || undefined,
      createdTs: editingId ? undefined : now,
    };

    upsertPallet(payload);
    reload();
    close();
  }

  function remove(id: string) {
    const ok = confirm("Eliminare questa pedana dal registro?");
    if (!ok) return;
    deletePallet(id);
    reload();
  }

  const input = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 800 as const,
  };

  const btn = (bg: string) => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  const card = {
    padding: 14,
    borderRadius: 16,
    border: "1px solid #e6e6e6",
    background: "white",
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>🧱 Registro Pedane</h1>
          <div style={{ opacity: 0.8, fontWeight: 800, marginTop: 4 }}>
            Anagrafica pedane + ultimo avvistamento (da Scan).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/" style={{ textDecoration: "none", fontWeight: 900 }}>
            ← Home
          </a>
          <a href="/stock" style={{ textDecoration: "none", fontWeight: 900 }}>
            📦 Stock
          </a>
          <button onClick={openAdd} style={btn("#2e7d32")}>
            + Aggiungi
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, ...card }}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr auto" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per codice / codice alternativo…"
            style={input}
          />
          <button onClick={reload} style={btn("#455a64")}>
            Aggiorna
          </button>
        </div>

        <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.8 }}>
          Totale: {filtered.length} pedane
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: 24, fontWeight: 900 }}>
            Nessuna pedana trovata. Premi “Aggiungi”.
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} style={{ ...card }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 1000 }}>{p.code}</div>
                  <div style={{ marginTop: 4, opacity: 0.85, fontWeight: 800 }}>
                    Tipo: <span style={{ fontWeight: 1000 }}>{p.type || "-"}</span>
                    {p.altCode ? (
                      <>
                        {" "}
                        · Alt: <span style={{ fontWeight: 1000 }}>{p.altCode}</span>
                      </>
                    ) : null}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75, fontWeight: 800 }}>
                    Ultimo visto: {fmtDate(p.lastSeenTs)}{" "}
                    {p.lastLat != null && p.lastLng != null ? `· GPS: ${p.lastLat.toFixed(5)}, ${p.lastLng.toFixed(5)}` : ""}
                    {p.lastSource ? ` · fonte: ${p.lastSource}` : ""}
                  </div>

                  {p.notes ? (
                    <div style={{ marginTop: 10, background: "#f6f6f6", padding: 10, borderRadius: 12, fontWeight: 800 }}>
                      📝 {p.notes}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button onClick={() => openEdit(p)} style={btn("#1e88e5")}>
                    Modifica
                  </button>
                  <button onClick={() => remove(p.id)} style={btn("#e53935")}>
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {open ? (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "white",
              borderRadius: 18,
              padding: 16,
              border: "1px solid #e6e6e6",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 1000 }}>
              {editingId ? "✏️ Modifica pedana" : "➕ Nuova pedana"}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Codice pedana</div>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Es: PEDANA-000123" style={input} />
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Tipo</div>
                <select value={type} onChange={(e) => setType(e.target.value)} style={input as any}>
                  {PALLET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Codice alternativo (facoltativo)</div>
                <input value={altCode} onChange={(e) => setAltCode(e.target.value)} placeholder="Es: IFCO-XYZ123" style={input} />
              </div>

              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Note (facoltative)</div>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note…" style={input} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                <button onClick={save} style={btn("#2e7d32")}>
                  Salva
                </button>
                <button onClick={close} style={btn("#616161")}>
                  Annulla
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginTop: 4 }}>
                ✅ Questo registro si aggiorna anche automaticamente quando scansioni (Scan → upsertPallet).
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
