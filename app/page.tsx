import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: "bold", color: "#0f172a" }}>
        📦 Pallet Tracker
      </h1>

      <p style={{ marginTop: 10, fontSize: 16, color: "#334155" }}>
        Gestione pedane e tracking con QR + GPS in tempo reale.
      </p>

      <div style={{ marginTop: 30 }}>
        <Link href="/scan">
          <button
            style={{
              width: "100%",
              padding: 16,
              fontSize: 18,
              fontWeight: "bold",
              borderRadius: 14,
              border: "none",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            📷 Scansiona QR Pedana
          </button>
        </Link>
      </div>

      <div style={{ marginTop: 15 }}>
        <button
          style={{
            width: "100%",
            padding: 16,
            fontSize: 18,
            fontWeight: "bold",
            borderRadius: 14,
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          🚚 Gestione Autisti (PROSSIMAMENTE)
        </button>
      </div>

      <div style={{ marginTop: 15 }}>
        <button
          style={{
            width: "100%",
            padding: 16,
            fontSize: 18,
            fontWeight: "bold",
            borderRadius: 14,
            border: "none",
            background: "#16a34a",
            color: "white",
            cursor: "pointer",
          }}
        >
          🏬 Gestione Negozi (PROSSIMAMENTE)
        </button>
      </div>

      <div style={{ marginTop: 15 }}>
        <button
          style={{
            width: "100%",
            padding: 16,
            fontSize: 18,
            fontWeight: "bold",
            borderRadius: 14,
            border: "none",
            background: "#f97316",
            color: "white",
            cursor: "pointer",
          }}
        >
          🏭 Depositi (PROSSIMAMENTE)
        </button>
      </div>

      <div
        style={{
          marginTop: 40,
          padding: 15,
          borderRadius: 14,
          background: "white",
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: "bold", color: "#0f172a" }}>
          🔥 Funzione principale attiva:
        </h2>
        <p style={{ marginTop: 8, color: "#334155" }}>
          ✔ Scansione QR pedana <br />
          ✔ Salvataggio posizione GPS <br />
          ✔ Tracciamento manuale posizione (in attesa database)
        </p>
      </div>
    </main>
  );
}
