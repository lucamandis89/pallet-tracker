"use client";

import React, { useMemo, useState } from "react";
import { addShop, getShopOptions, getShops, removeShop, updateShop, ShopItem, getDefaultShop } from "../lib/storage";

export default function ShopsPage() {
  const defaultShop = getDefaultShop();

  const [list, setList] = useState<ShopItem[]>(() => getShops()); // solo negozi "reali"
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const totalReal = useMemo(() => list.length, [list]);
  const totalVisible = useMemo(() => getShopOptions().length, [list]);

  function refresh() {
    setList(getShops());
  }

  function resetForm() {
    setName("");
    setCode("");
    setPhone("");
    setAddress("");
    setNotes("");
  }

  function onAdd() {
    const n = name.trim();
    if (!n) return alert("Inserisci il nome negozio.");
    try {
      addShop({
        name: n,
        code: code.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      refresh();
      resetForm();
    } catch (e: any) {
      if (e?.message === "LIMIT_100") alert("Limite raggiunto: massimo 100 negozi.");
      else alert("Errore: " + (e?.message || "sconosciuto"));
    }
  }

  function onEdit(item: ShopItem) {
    const newName = prompt("Nome negozio:", item.name);
    if (newName === null) return;
    const n = newName.trim();
    if (!n) return alert("Nome non valido.");

    const newCode = prompt("Codice (facoltativo):", item.code || "") ?? item.code || "";
    const newPhone = prompt("Telefono (facoltativo):", item.phone || "") ?? item.phone || "";
    const newAddr = prompt("Indirizzo (facoltativo):", item.address || "") ?? item.address || "";
    const newNotes = prompt("Note (facoltative):", item.notes || "") ?? item.notes || "";

    updateShop(item.id, {
      name: n,
      code: newCode.trim() || undefined,
      phone: newPhone.trim() || undefined,
      address: newAddr.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });
    refresh();
  }

  function onDelete(item: ShopItem) {
    if (!confirm(`Eliminare negozio "${item.name}"?`)) return;
    removeShop(item.id);
    refresh();
  }

  const input: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
  };

  const btn = (bg: string): React.CSSProperties => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  const card: React.CSSProperties = {
    padding: 14,
    borderRadius: 16,
    border: "2px solid #2e7d32",
    background: "#e8f5e9",
    marginTop: 12,
  };

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🏪 Gestione Negozi</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Massimo <b>100 negozi</b>. In lista c’è sempre anche <b>{defaultShop.name}</b> (default).
      </p>

      <div style={{ padding: 12, borderRadius: 12, background: "#f2f2f2", fontWeight: 900 }}>
        Negozi inseriti: {totalReal} / 100 — Voci disponibili nei menu: {totalVisible}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>➕ Aggiungi Negozio</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Nome *</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="Es: Supermercato Centro" />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Codice</div>
            <input value={code} onChange={(e) => setCode(e.target.value)} style={input} placeholder="Facoltativo" />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Telefono</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={input} placeholder="Facoltativo" inputMode="tel" />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Indirizzo</div>
            <input value={address} onChange={(e) => setAddress(e.target.value)} style={input} placeholder="Facoltativo" />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={input} placeholder="Facoltative" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={onAdd} style={btn("#2e7d32")}>
            Salva Negozio
          </button>
          <button onClick={resetForm} style={btn("#616161")}>
            Svuota
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 8 }}>📋 Elenco (compreso default)</h2>

        <div style={{ display: "grid", gap: 10 }}>
          {/* DEFAULT shop (non eliminabile) */}
          <div style={{ padding: 14, borderRadius: 16, border: "2px dashed #999", background: "white" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{defaultShop.name}</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>✅ Sempre disponibile (non eliminabile)</div>
          </div>

          {list.length === 0 ? (
            <div style={{ padding: 14, borderRadius: 14, border: "1px solid #ddd", background: "white" }}>
              Nessun negozio inserito (oltre al default).
            </div>
          ) : (
            list.map((s) => (
              <div key={s.id} style={{ padding: 14, borderRadius: 16, border: "1px solid #ddd", background: "white" }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{s.name}</div>
                <div style={{ opacity: 0.85, marginTop: 6 }}>
                  {s.code ? <>🏷️ {s.code} &nbsp; </> : null}
                  {s.phone ? <>📞 {s.phone} &nbsp; </> : null}
                  {s.address ? <>📍 {s.address}</> : null}
                  {s.notes ? <div style={{ marginTop: 6 }}>📝 {s.notes}</div> : null}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <button onClick={() => onEdit(s)} style={btn("#1565c0")}>
                    Modifica
                  </button>
                  <button onClick={() => onDelete(s)} style={btn("#c62828")}>
                    Elimina
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
