import { useMemo, useState } from "react";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthLabel = (key) => {
  if (!key) return "Mês";
  const parts = String(key).split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) return "Mês";
  return new Date(year, month - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
};

const formatDate = (value, options) => {
  if (!value) return "—";
  const date = new Date(String(value).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", options);
};

const tone = (value) => {
  const n = Number(value) || 0;
  if (n < 0) return "#f87171";
  if (n < 500) return "#fbbf24";
  return "#4ade80";
};

export default function HorizonPage({ projection }) {
  const months = Array.isArray(projection && projection.months) ? projection.months.filter(Boolean) : [];
  const allDays = Array.isArray(projection && projection.days) ? projection.days.filter(Boolean) : [];
  const [selectedMonth, setSelectedMonth] = useState("");
  const activeMonth = months.some((item) => item && item.month === selectedMonth)
    ? selectedMonth
    : (months[0] && months[0].month) || "";

  const days = useMemo(
    () => allDays.filter((day) => day && day.month === activeMonth),
    [allDays, activeMonth]
  );

  const month = months.find((item) => item && item.month === activeMonth);

  if (!months.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 24 }}>
        <p style={{ fontWeight: 700 }}>Ainda não há dados para o Horizonte.</p>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
          Cadastre uma conta e suas movimentações para começar a projeção.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ background: "linear-gradient(135deg,#1e1e2e,#16213e)" }}>
        <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Seu horizonte</p>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, marginTop: 4 }}>
          {fmt(projection && projection.lowestBalance)}
        </h2>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
          Menor saldo projetado em {formatDate(projection && projection.lowestBalanceDate)}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
        {months.map((item, index) => {
          const color = tone(item.lowestBalance);
          const active = item.month === activeMonth;
          return (
            <button
              key={item.month || index}
              type="button"
              className="btn"
              onClick={() => setSelectedMonth(item.month || "")}
              style={{ minWidth: 118, padding: 12, textAlign: "left", background: active ? "#242438" : "#1a1a24", border: active ? "1px solid #6366f1" : "1px solid transparent", color: "#f1f5f9" }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{monthLabel(item.month)}</p>
              <p style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>menor saldo</p>
              <strong style={{ color, fontSize: 14 }}>{fmt(item.lowestBalance)}</strong>
            </button>
          );
        })}
      </div>

      {month && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "#6b7280" }}>Saldo final</p>
              <strong>{fmt(month.closingBalance)}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#6b7280" }}>Diário planejado</p>
              <strong style={{ color: "#a5b4fc" }}>{fmt(month.dailyBudgetTotal)}</strong>
            </div>
          </div>
        </div>
      )}

      <p className="section-label">Fluxo dia a dia</p>
      {days.map((day, index) => {
        const color = tone(day.balance);
        const hasMovement = Number(day.income) > 0 || Number(day.expense) > 0 || Number(day.dailyBudget) > 0;
        return (
          <div key={day.date || index} className="card" style={{ padding: 12, opacity: hasMovement ? 1 : .72, borderLeft: `3px solid ${color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700 }}>
                  {formatDate(day.date, { weekday: "short", day: "2-digit", month: "2-digit" })}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {Number(day.income) > 0 && <span style={{ fontSize: 10, color: "#4ade80" }}>+ {fmt(day.income)}</span>}
                  {Number(day.expense) > 0 && <span style={{ fontSize: 10, color: "#f87171" }}>- {fmt(day.expense)}</span>}
                  {Number(day.dailyBudget) > 0 && <span style={{ fontSize: 10, color: "#a5b4fc" }}>diário {fmt(day.dailyBudget)}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 10, color: "#6b7280" }}>saldo</p>
                <strong style={{ color, fontSize: 14 }}>{fmt(day.balance)}</strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
