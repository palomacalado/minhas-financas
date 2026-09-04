import { useMemo, useState } from "react";
import { formatDateBr } from "../utils/dateUtils";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthLabel = (key = "") => {
  const [year, month] = String(key).split("-").map(Number);
  if (!year || !month) return "mês";
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
};

const safeDate = (value, options) => {
  if (!value) return "—";
  try { return formatDateBr(value, options); } catch { return "—"; }
};

const tone = (value) => {
  const n = Number(value) || 0;
  if (n < 0) return { fg: "#f87171" };
  if (n < 500) return { fg: "#fbbf24" };
  return { fg: "#4ade80" };
};

export default function HorizonPage({ projection }) {
  const months = Array.isArray(projection?.months) ? projection.months : [];
  const allDays = Array.isArray(projection?.days) ? projection.days : [];
  const [selectedMonth, setSelectedMonth] = useState("");
  const activeMonth = months.some(item => item.month === selectedMonth)
    ? selectedMonth
    : months[0]?.month || "";
  const days = useMemo(
    () => allDays.filter((day) => day?.month === activeMonth),
    [allDays, activeMonth]
  );
  const month = months.find((item) => item.month === activeMonth);

  if (!months.length) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <strong>Não consegui montar o Horizonte.</strong>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>Confira se existe uma conta com saldo disponível e tente novamente.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ background: "linear-gradient(135deg,#1e1e2e,#16213e)" }}>
        <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: .5 }}>Seu horizonte</p>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, marginTop: 4 }}>{fmt(projection?.lowestBalance)}</h2>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Menor saldo projetado em {safeDate(projection?.lowestBalanceDate)}</p>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
        {months.map((item) => {
          const t = tone(item.lowestBalance);
          const active = item.month === activeMonth;
          return (
            <button key={item.month} className="btn" onClick={() => setSelectedMonth(item.month)} style={{ minWidth:118,padding:12,textAlign:"left",background:active?"#242438":"#1a1a24",border:active?"1px solid #6366f1":"1px solid transparent",color:"#f1f5f9" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:12,fontWeight:700,textTransform:"uppercase" }}>{monthLabel(item.month)}</span>
                <span style={{ width:7,height:7,borderRadius:99,background:t.fg }} />
              </div>
              <p style={{ marginTop:8,fontSize:11,color:"#6b7280" }}>menor saldo</p>
              <strong style={{ color:t.fg,fontSize:14 }}>{fmt(item.lowestBalance)}</strong>
            </button>
          );
        })}
      </div>

      {month && (
        <div className="card">
          <div style={{ display:"flex",justifyContent:"space-between",gap:12,marginBottom:12 }}>
            <div><p style={{ fontSize:11,color:"#6b7280" }}>Saldo final</p><strong>{fmt(month.closingBalance)}</strong></div>
            <div style={{ textAlign:"right" }}><p style={{ fontSize:11,color:"#6b7280" }}>Diário planejado</p><strong style={{ color:"#a5b4fc" }}>{fmt(month.dailyBudgetTotal)}</strong></div>
          </div>
          <p style={{ fontSize:12,color:"#6b7280",lineHeight:1.5 }}>O Diário é a soma dos gastos variáveis cadastrados para o mês, distribuída automaticamente entre os dias. Parcelas de cartão aparecem no dia de vencimento da fatura.</p>
        </div>
      )}

      <p className="section-label">Fluxo dia a dia</p>
      {days.map((day) => {
        const t = tone(day?.balance);
        const movements = Array.isArray(day?.movements) ? day.movements : [];
        const hasMovement = Number(day?.income)>0 || Number(day?.expense)>0 || Number(day?.dailyBudget)>0;
        return (
          <div key={day?.date || Math.random()} className="card" style={{ padding:12,opacity:hasMovement?1:.72,borderLeft:`3px solid ${t.fg}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12 }}>
              <div style={{ minWidth:0,flex:1 }}>
                <p style={{ fontSize:12,fontWeight:700 }}>{safeDate(day?.date,{ weekday:"short",day:"2-digit",month:"2-digit" })}</p>
                <div style={{ display:"flex",gap:8,marginTop:4,flexWrap:"wrap" }}>
                  {day?.income>0 && <span style={{ fontSize:10,color:"#4ade80" }}>+ {fmt(day.income)}</span>}
                  {day?.expense>0 && <span style={{ fontSize:10,color:"#f87171" }}>- {fmt(day.expense)}</span>}
                  {day?.dailyBudget>0 && <span style={{ fontSize:10,color:"#a5b4fc" }}>diário {fmt(day.dailyBudget)}</span>}
                </div>
                {movements.length>0 && <div style={{ marginTop:8,display:"flex",flexDirection:"column",gap:4 }}>
                  {movements.map((movement,index) => <div key={movement?.id || `${day.date}-${index}`} style={{ display:"flex",justifyContent:"space-between",gap:10,fontSize:10,color:"#8b8b9d" }}>
                    <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{movement?.tipo==="cartao"?"💳 ":movement?.tipo==="economia"?"🏦 ":""}{movement?.cardName?movement.cardName+" · ":""}{movement?.descricao || movement?.categoria || "Movimentação"}</span>
                    <span style={{ flexShrink:0,color:movement?.tipo==="receita"?"#4ade80":"#fca5a5" }}>{movement?.tipo==="receita"?"+":"-"}{fmt(movement?.valor)}</span>
                  </div>)}
                </div>}
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}><p style={{ fontSize:10,color:"#6b7280" }}>saldo</p><strong style={{ color:t.fg,fontSize:14 }}>{fmt(day?.balance)}</strong></div>
            </div>
          </div>
        );
      })}
    </>
  );
}
