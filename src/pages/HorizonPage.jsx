import { useMemo, useState } from "react";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthLabel = (key) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
};

const tone = (value) => {
  if (value < 0) return { fg: "#f87171", bg: "rgba(248,113,113,.12)", label: "atenção" };
  if (value < 500) return { fg: "#fbbf24", bg: "rgba(251,191,36,.12)", label: "apertado" };
  return { fg: "#4ade80", bg: "rgba(74,222,128,.10)", label: "positivo" };
};

export default function HorizonPage({ projection }) {
  const [selectedMonth, setSelectedMonth] = useState(projection.months[0]?.month || "");
  const activeMonth = selectedMonth || projection.months[0]?.month;
  const days = useMemo(
    () => projection.days.filter((day) => day.month === activeMonth),
    [projection.days, activeMonth]
  );
  const month = projection.months.find((item) => item.month === activeMonth);

  if (!projection.months.length) {
    return <div className="card" style={{ textAlign: "center" }}>Sem dados para projetar.</div>;
  }

  return (
    <>
      <div className="card" style={{ background: "linear-gradient(135deg,#1e1e2e,#16213e)" }}>
        <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: .5 }}>Seu horizonte</p>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, marginTop: 4 }}>
          {fmt(projection.lowestBalance)}
        </h2>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
          Menor saldo projetado em {new Date(projection.lowestBalanceDate + "T12:00:00").toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
        {projection.months.map((item) => {
          const t = tone(item.lowestBalance);
          const active = item.month === activeMonth;
          return (
            <button
              key={item.month}
              className="btn"
              onClick={() => setSelectedMonth(item.month)}
              style={{
                minWidth: 118,
                padding: 12,
                textAlign: "left",
                background: active ? "#242438" : "#1a1a24",
                border: active ? "1px solid #6366f1" : "1px solid transparent",
                color: "#f1f5f9"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{monthLabel(item.month)}</span>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: t.fg }} />
              </div>
              <p style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>menor saldo</p>
              <strong style={{ color: t.fg, fontSize: 14 }}>{fmt(item.lowestBalance)}</strong>
            </button>
          );
        })}
      </div>

      {month && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "#6b7280" }}>Saldo final</p>
              <strong>{fmt(month.closingBalance)}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#6b7280" }}>Diário planejado</p>
              <strong style={{ color: "#a5b4fc" }}>{fmt(month.dailyBudgetTotal)}</strong>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            O Diário é a soma dos gastos variáveis cadastrados para o mês, distribuída automaticamente entre os dias.
          </p>
        </div>
      )}

      <p className="section-label">Fluxo dia a dia</p>
      {days.map((day) => {
        const t = tone(day.balance);
        const hasMovement = day.income > 0 || day.expense > 0 || day.dailyBudget > 0;
        return (
          <div
            key={day.date}
            className="card"
            style={{ padding: 12, opacity: hasMovement ? 1 : .72, borderLeft: `3px solid ${t.fg}` }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700 }}>
                  {new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {day.income > 0 && <span style={{ fontSize: 10, color: "#4ade80" }}>+ {fmt(day.income)}</span>}
                  {day.expense > 0 && <span style={{ fontSize: 10, color: "#f87171" }}>- {fmt(day.expense)}</span>}
                  {day.dailyBudget > 0 && <span style={{ fontSize: 10, color: "#a5b4fc" }}>diário {fmt(day.dailyBudget)}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "#6b7280" }}>saldo</p>
                <strong style={{ color: t.fg, fontSize: 14 }}>{fmt(day.balance)}</strong>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
