"use client";

import React, { useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  code: string;
  lat?: number;
  lng?: number;
  date: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("pallet_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  function clearHistory() {
    localStorage.removeItem("pallet_history");
    setHistory([]);
  }

  function downloadFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeCsv(value: any, sep: string) {
    const s = String(value ?? "");
    // se contiene separatore, virgolette o newline → racchiudi tra ""
    if (s.includes(sep) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  }

  function exportCsv(sep: "," | ";") {
    const headers = ["id", "code", "date", "lat", "lng"];
    const rows = history.map((h) => [
      escapeCsv(h.id, sep),
      escapeCsv(h.code, sep),
      escapeCsv(h.date, sep),
      escapeCsv(h.lat ?? "", sep),
      escapeCsv(h.lng ?? "", sep),
    ]);

    // BOM UTF-8 per Excel (apre meglio gli accenti)
    const bom = "\uFEFF";
    const csv = bom + [headers.join(sep), ...rows.map((r) => r.join(sep))].join("\n");

    const ts = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    downloadFile(`storico-pedane_${ts}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>📌 Storico Pedane</h1>

      {history.length === 0 ? (
        <p style={{ fontSize: 16, opacity: 0.8 }}>Nessuna scansione salvata.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ fontWeight: 900, paddingTop: 10 }}>Totale scansioni: {history.length}</div>

            <button
              onClick={() => exportCsv(",")}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#1e88e5",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ⬇️ Export CSV (,)
            </button>

            <button
              onClick={() => exportCsv(";")}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#0b1220",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ⬇️ Export CSV (; Excel)
            </button>

            <button
              onClick={clearHistory}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#e53935",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              🗑️ Cancella tutto
            </button>
          </div>

          {history.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #ddd",
                marginBottom: 12,
                background: "#f9f9f9",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>📦 {item.code}</div>
              <div style={{ marginTop: 6, fontSize: 14 }}>🕒 {item.date}</div>

              {typeof item.lat === "number" && typeof item.lng === "number" ? (
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  📍 GPS: {item.lat}, {item.lng}
                  <br />
                  <a
                    href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontWeight: 900 }}
                  >
                    Apri su Google Maps
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>GPS non disponibile</div>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
