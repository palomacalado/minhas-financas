import { useEffect, useMemo, useRef, useState } from "react";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
};
const monthLabel = (key) => {
  if (!key) return "Mês";
  const [year, month] = String(key).split("-").map(Number);
  if (!year || !month) return "Mês";
  return new Date(year, month-1, 1).toLocaleDateString("pt-BR", { month:"short", year:"numeric" }).replace(".", "");
};
const formatDate = (value, options) => {
  if (!value) return "—";
  const date = new Date(String(value).slice(0,10)+"T12:00:00");
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR", options);
};
const tone = (value) => Number(value||0)<0 ? "#f87171" : Number(value||0)<500 ? "#fbbf24" : "#4ade80";

export default function HorizonPage({ projection }) {
  const months = Array.isArray(projection?.months) ? projection.months.filter(Boolean) : [];
  const allDays = Array.isArray(projection?.days) ? projection.days.filter(Boolean) : [];
  const nowKey = currentMonthKey();
  const initialMonth = months.some(m=>m.month===nowKey) ? nowKey : (months[0]?.month || "");
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const monthRefs = useRef({});
  const activeMonth = months.some(m=>m.month===selectedMonth) ? selectedMonth : initialMonth;

  useEffect(() => {
    if (months.some(m=>m.month===nowKey)) setSelectedMonth(nowKey);
  }, [nowKey, projection?.startDate, projection?.endDate]);

  useEffect(() => {
    const node = monthRefs.current[activeMonth];
    if (node) node.scrollIntoView({ behavior:"auto", inline:"center", block:"nearest" });
  }, [activeMonth]);

  const days = useMemo(() => allDays.filter(day=>day?.month===activeMonth), [allDays, activeMonth]);
  const month = months.find(item=>item?.month===activeMonth);

  if (!months.length) return <div className="card" style={{textAlign:"center",padding:24}}><p style={{fontWeight:700}}>Ainda não há dados para o Horizonte.</p><p style={{color:"#6b7280",fontSize:12,marginTop:6}}>Cadastre uma conta e suas movimentações para começar a projeção.</p></div>;

  return <div>
    <div className="card" style={{background:"linear-gradient(135deg,#1e1e2e,#16213e)"}}>
      <p style={{fontSize:11,color:"#6b7280",textTransform:"uppercase"}}>Seu horizonte financeiro</p>
      <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:24,marginTop:4}}>{fmt(projection?.lowestBalance)}</h2>
      <p style={{color:"#6b7280",fontSize:12,marginTop:4}}>Menor saldo futuro em {formatDate(projection?.lowestBalanceDate)}</p>
      <p style={{color:"#4b5563",fontSize:11,marginTop:8}}>Histórico desde janeiro · previsão até {formatDate(projection?.endDate,{month:"long",year:"numeric"})}</p>
    </div>

    <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:12,paddingBottom:2,scrollBehavior:"smooth"}}>
      {months.map((item,index)=>{
        const active=item.month===activeMonth;
        return <button ref={node=>{if(node) monthRefs.current[item.month]=node;}} key={item.month||index} type="button" className="btn" onClick={()=>setSelectedMonth(item.month||"")} style={{minWidth:126,padding:12,textAlign:"left",background:active?"#242438":"#1a1a24",border:active?"1px solid #6366f1":"1px solid transparent",color:"#f1f5f9"}}>
          <p style={{fontSize:12,fontWeight:700,textTransform:"uppercase"}}>{monthLabel(item.month)}{item.month===nowKey?" · atual":""}</p>
          <p style={{marginTop:8,fontSize:11,color:"#6b7280"}}>menor saldo</p>
          <strong style={{color:tone(item.lowestBalance),fontSize:14}}>{fmt(item.lowestBalance)}</strong>
        </button>;
      })}
    </div>

    {month && <div className="card"><div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><p style={{fontSize:11,color:"#6b7280"}}>Saldo final</p><strong>{fmt(month.closingBalance)}</strong></div><div style={{textAlign:"right"}}><p style={{fontSize:11,color:"#6b7280"}}>Diário planejado</p><strong style={{color:"#a5b4fc"}}>{fmt(month.dailyBudgetTotal)}</strong></div></div></div>}

    <p className="section-label">Fluxo dia a dia</p>
    {days.map((day,index)=>{
      const color=tone(day.balance);
      const hasMovement=Number(day.income)>0||Number(day.expense)>0||Number(day.dailyBudget)>0;
      return <div key={day.date||index} className="card" style={{padding:12,opacity:hasMovement?1:.72,borderLeft:`3px solid ${color}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><p style={{fontSize:12,fontWeight:700}}>{formatDate(day.date,{weekday:"short",day:"2-digit",month:"2-digit"})}</p><div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>{Number(day.income)>0&&<span style={{fontSize:10,color:"#4ade80"}}>+ {fmt(day.income)}</span>}{Number(day.expense)>0&&<span style={{fontSize:10,color:"#f87171"}}>- {fmt(day.expense)}</span>}{Number(day.dailyBudget)>0&&<span style={{fontSize:10,color:"#a5b4fc"}}>diário {fmt(day.dailyBudget)}</span>}</div></div><div style={{textAlign:"right",flexShrink:0}}><p style={{fontSize:10,color:"#6b7280"}}>saldo</p><strong style={{color,fontSize:14}}>{fmt(day.balance)}</strong></div></div></div>;
    })}
  </div>;
}
