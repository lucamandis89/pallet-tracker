"use client";

import React, { useEffect, useMemo, useState } from "react";

type PalletStatus = "IN_DEPOSITO" | "IN_TRANSITO" | "IN_NEGOZIO";

type Pallet = {
  id: string;
  code: string; // QR / codice univoco
  type: string; // EPAL, CHEP, IFCO...
  status: PalletStatus;
  locationLabel: string;
  updatedAt: string;
  createdAt: string;
};

const STORAGE_PALLETS = "pallet_registry";
const STORAGE_TYPES = "pallet_types_v1";

function uid() {
  return Date.now().toString() + "_" + Math.random().toString(16).slice(2);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Tipi predefiniti “vendibili” (coprono quasi tutto)
const DEFAULT_TYPES = [
  "EPAL (EUR) 1200x800",
  "EPAL 2 1200x1000",
  "Half pallet 800x600",
  "Display pallet",
  "CHEP Blue",
  "CHEP Red",
  "LPR",
  "DUSS",
  "IFCO (casse/RTI)",
  "IPP / FSW",
  "CP (Chemical)",
  "US Pallet 48x40",
  "Altro…",
];

export default function PalletsPage() {
  const [items, setItems] = useState<Pallet[]>([]);
  const [q, setQ] = useState("");

  // tipi (predefiniti + personalizzati)
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const allTypes = useMemo(() => {
    const merged = [...DEFAULT_TYPES.filter((t) => t !== "Altro…"), ...customTypes];
    // rimetto "Altro…" in fondo
    return [...merged, "Altro…"];
  }, [customTypes]);

  // form
  const [code, setCode] = useState("");
  const [typeSelect, setTypeSelect] = useState<string>("EPAL (EUR) 1200x800");
  const [typeCustom, setTypeCustom] = useState<string>(""); // usato solo se "Altro…"
  const [status, setStatus] = useState<PalletStatus>("IN_DEPOSITO");
  const [locationLabel, setLocationLabel] = useState("Deposito: —");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(safeParse<Pallet[]>(localStorage.getItem(STORAGE_PALLETS), []));
    setCustomTypes(safeParse<string[]>(localStorage.getItem(STORAGE_TYPES), []));
  }, []);

  function persistPallets(next: Pallet[]) {
    setItems(next);
    localStorage.setItem(STORAGE_PALLETS, JSON.stringify(next));
  }

  function persistTypes(next: string[]) {
    // normalizzo: tolgo vuoti, trim, unici (case-insensitive)
    const cleaned = next
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.findIndex((a) => a.toLowerCase() === v.toLowerCase()) === i);

    setCustomTypes(cleaned);
    localStorage.setItem(STORAGE_TYPES, JSON.stringify(cleaned));
  }

  function resetForm() {
    setEditingId(null);
    setCode("");
    setTypeSelect("EPAL (EUR) 1200x800");
    setTypeCustom("");
    setStatus("IN_DEPOSITO");
    setLocationLabel("Deposito: —");
  }

  function resolvedType(): string {
    if (typeSelect !== "Altro…") return typeSelect.trim();
    return typeCustom.trim();
  }

  function onSubmit() {
    const c = code.trim();
    if (!c) return alert("Inserisci il codice pedana (univoco).");

    const t = resolvedType();
    if (!t) return alert("Seleziona un tipo oppure inserisci un tipo personalizzato.");

    // univocità codice
    const exists = items.some((p) => p.code.toLowerCase() === c.toLowerCase() && p.id !== editingId);
    if (exists) return alert("Codice già esistente. Deve essere univoco.");

    // se tipo è custom, salvalo
    if (typeSelect === "Altro…") {
      persistTypes([t, ...customTypes]);
    }

    const now = new Date().toLocaleString();

    if (editingId) {
      const next = items.map((p) =>
        p.id === editingId
          ? { ...p, code: c, type: t, status, locationLabel: locationLabel.trim(), updatedAt: now }
          : p
      );
      persistPallets(next);
      resetForm();
      return;
    }

    const newItem: Pallet = {
      id: uid(),
      code: c,
      type: t,
      status,
      locationLabel: locationLabel.trim(),
      createdAt: now,
      updatedAt: now,
    };

    persistPallets([newItem, ...items]);
    resetForm();
  }

  function onEdit(p: Pallet) {
    setEditingId(p.id);
    setCode(p.code);

    // se è tra i predefiniti o custom, lo seleziono
    const inList = allTypes.includes(p.type);
    if (inList) {
      setTypeSelect(p.type);
      setTypeCustom("");
    } else {
      setTypeSelect("Altro…");
      setTypeCustom(p.type);
    }

    setStatus(p.status);
    setLocationLabel(p.locationLabel);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questa pedana?")) return;
    persistPallets(items.filter((x) => x.id !== id));
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => {
      const hay = `${p.code} ${p.type} ${p.status} ${p.locationLabel}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const badge = (st: PalletStatus) => {
    const map: Record<PalletStatus, { bg: string; fg: string; label: string }> = {
      IN_DEPOSITO: { bg: "#e8f5e9", fg: "#1b5e20", label: "In deposito" },
      IN_TRANSITO: { bg: "#e3f2fd", fg: "#0d47a1", label: "In transito" },
      IN_NEGOZIO: { bg: "#fff3e0", fg: "#e65100", label: "In negozio" },
    };
    return map[st];
  };

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontSize: 16,
    background: "white",
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

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🧱 Registro Pedane</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>
        Gestione pedane con tipi predefiniti (EPAL/CHEP/LPR/DUSS/IFCO...) + tipi personalizzati.
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{editingId ? "✏️ Modifica Pedana" : "➕ Nuova Pedana"}</div>

        <input
          style={inputStyle}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Codice pedana (QR) es. PEDANA-0001"
        />

        <select style={inputStyle} value={typeSelect} onChange={(e) => setTypeSelect(e.target.value)}>
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {typeSelect === "Altro…" ? (
          <input
            style={inputStyle}
            value={typeCustom}
            onChange={(e) => setTypeCustom(e.target.value)}
            placeholder="Inserisci nuovo tipo (es. CHEP 1200x1000 / IFCO 6410 / ecc)"
          />
        ) : null}

        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as PalletStatus)}>
          <option value="IN_DEPOSITO">In deposito</option>
          <option value="IN_TRANSITO">In transito (autista)</option>
          <option value="IN_NEGOZIO">In negozio</option>
        </select>

        <input
          style={inputStyle}
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          placeholder='Posizione (testo) es. "Deposito: Olbia" / "Autista: Mario" / "Negozio: Conad"'
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn("#2e7d32")} onClick={onSubmit}>
            {editingId ? "Salva modifiche" : "Aggiungi"}
          </button>

          {editingId ? (
            <button style={btn("#9e9e9e")} onClick={resetForm}>
              Annulla
            </button>
          ) : null}

          <a
            href="/"
            style={{
              ...btn("#0b1220"),
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ← Home
          </a>
        </div>

        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Tipi personalizzati salvati: <b>{customTypes.length}</b>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          style={inputStyle}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Cerca pedana (codice, tipo, stato, posizione)"
        />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessuna pedana registrata.</div>
        ) : (
          filtered.map((p) => {
            const b = badge(p.status);
            return (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, background: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{p.code}</div>
                    <div style={{ marginTop: 6 }}>
                      Tipo: <b>{p.type}</b>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      Posizione: <b>{p.locationLabel}</b>
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                      Aggiornato: {p.updatedAt}
                    </div>
                  </div>

                  <div style={{ padding: "8px 10px", borderRadius: 999, background: b.bg, color: b.fg, fontWeight: 900 }}>
                    {b.label}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={btn("#6a1b9a")} onClick={() => onEdit(p)}>
                    Modifica
                  </button>
                  <button style={btn("#e53935")} onClick={() => onDelete(p.id)}>
                    Elimina
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
