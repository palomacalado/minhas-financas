import { useMemo, useState } from "react";
import { buildProjection } from "../services/projectionEngine";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const todayIso = () => new Date().toISOString().split("T")[0];

export default function PlanningPage(props) {
  const {
    accounts, savingsGoals, cards, cardPurchases, baseTransactions, cardProjectionTransactions,
    onCreateAccount, onDeleteAccount, onCreateGoal, onUpdateGoal, onContributeGoal, onDeleteGoal,
    onCreateCard, onDeleteCard, onCreateCardPurchase, onDeleteCardPurchase,
  } = props;

  const [section, setSection] = useState("contas");
  const [accountForm, setAccountForm] = useState({ name:"", kind:"checking", balance:"", includeInAvailable:true });
  const [goalForm, setGoalForm] = useState({ name:"", target:"", current:"" });
  const [cardForm, setCardForm] = useState({ name:"", closingDay:"", dueDay:"", limit:"" });
  const [purchaseForm, setPurchaseForm] = useState({ cardId:"", description:"", totalAmount:"", purchaseDate:todayIso(), installments:1, category:"Outros" });
  const [sim, setSim] = useState({ amount:"", date:todayIso(), description:"Compra simulada" });

  const availableBalance = accounts.filter(a => a.includeInAvailable).reduce((s,a)=>s+a.balance,0);
  const assetsBalance = accounts.filter(a => !a.includeInAvailable || a.kind === "savings").reduce((s,a)=>s+a.balance,0)
    + savingsGoals.reduce((s,g)=>s+g.current,0);

  const simulation = useMemo(() => {
    const start = todayIso();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);
    const end = endDate.toISOString().split("T")[0];
    const tx = [...baseTransactions, ...cardProjectionTransactions];
    const base = buildProjection({ transactions:tx, initialBalance:availableBalance, startDate:start, endDate:end });

    const amount = Number(sim.amount) || 0;
    const hypothetical = amount > 0 ? [...tx, {
      id:"hypothetical",
      tipo:"despesa",
      categoria:"Simulação",
      descricao:sim.description || "Compra simulada",
      valor:amount,
      data:sim.date,
      recorrente:false,
    }] : tx;

    const withSim = buildProjection({ transactions:hypothetical, initialBalance:availableBalance, startDate:start, endDate:end });
    return {
      baseLowest:base.lowestBalance,
      newLowest:withSim.lowestBalance,
      date:withSim.lowestBalanceDate,
      impact:withSim.lowestBalance-base.lowestBalance,
    };
  }, [sim, baseTransactions, cardProjectionTransactions, availableBalance]);

  const navButton = (id,label) => (
    <button className="btn" onClick={()=>setSection(id)}
      style={{ flex:1, padding:"9px 5px", fontSize:11, background:section===id?"#6366f1":"#1a1a24", color:section===id?"#fff":"#8b8b9d" }}>
      {label}
    </button>
  );

  return (
    <div className="fade-in">
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {navButton("contas","Contas")}
        {navButton("patrimonio","Patrimônio")}
        {navButton("cartoes","Cartões")}
        {navButton("simular","E se...?")}
      </div>

      {section==="contas" && <>
        <div className="card" style={{ background:"linear-gradient(135deg,#1e1e2e,#16213e)" }}>
          <p style={{ fontSize:12, color:"#8b8b9d" }}>Saldo disponível para o Horizonte</p>
          <h2 style={{ fontSize:28, marginTop:4 }}>{fmt(availableBalance)}</h2>
          <p style={{ fontSize:11, color:"#6b7280", marginTop:6 }}>Somente contas marcadas como disponíveis entram no caixa projetado.</p>
        </div>

        {accounts.map(a => (
          <div className="card" key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontWeight:700 }}>{a.name}</p>
              <p style={{ fontSize:11, color:"#6b7280" }}>{a.kind} · {a.includeInAvailable ? "entra no saldo" : "separada do saldo"}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontWeight:700 }}>{fmt(a.balance)}</p>
              <button onClick={()=>onDeleteAccount(a.id)} style={{ border:0, background:"none", color:"#6b7280", cursor:"pointer" }}>remover</button>
            </div>
          </div>
        ))}

        <div className="card">
          <p style={{ fontWeight:700, marginBottom:10 }}>Nova conta</p>
          <input className="input" placeholder="Nome: Itaú, Nubank..." value={accountForm.name} onChange={e=>setAccountForm(f=>({...f,name:e.target.value}))} style={{ marginBottom:8 }}/>
          <select className="select" value={accountForm.kind} onChange={e=>setAccountForm(f=>({
            ...f,
            kind:e.target.value,
            includeInAvailable:["va","vr","savings"].includes(e.target.value) ? false : f.includeInAvailable
          }))} style={{ marginBottom:8 }}>
            <option value="checking">Conta corrente</option>
            <option value="cash">Dinheiro</option>
            <option value="va">VA</option>
            <option value="vr">VR</option>
            <option value="savings">Reserva</option>
          </select>
          <input className="input" type="number" placeholder="Saldo atual" value={accountForm.balance} onChange={e=>setAccountForm(f=>({...f,balance:e.target.value}))} style={{ marginBottom:8 }}/>
          <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#a5b4fc", marginBottom:10 }}>
            <input type="checkbox" checked={accountForm.includeInAvailable} onChange={e=>setAccountForm(f=>({...f,includeInAvailable:e.target.checked}))}/>
            entra no saldo disponível
          </label>
          <button className="btn" onClick={async()=>{ if(!accountForm.name) return; await onCreateAccount(accountForm); setAccountForm({name:"",kind:"checking",balance:"",includeInAvailable:true}); }}
            style={{ width:"100%", padding:12, background:"#6366f1", color:"#fff" }}>
            Salvar conta
          </button>
        </div>
      </>}

      {section==="patrimonio" && <>
        <div className="card" style={{ background:"linear-gradient(135deg,#14251f,#172036)" }}>
          <p style={{ fontSize:12, color:"#8b8b9d" }}>Patrimônio separado do caixa</p>
          <h2 style={{ fontSize:28, marginTop:4 }}>{fmt(assetsBalance)}</h2>
        </div>

        {savingsGoals.map(g => {
          const pct = g.target > 0 ? Math.min(g.current/g.target*100,100) : 0;
          return (
            <div className="card" key={g.id}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <strong>{g.name}</strong>
                <button onClick={()=>onDeleteGoal(g.id)} style={{ background:"none", border:0, color:"#6b7280" }}>✕</button>
              </div>
              <p style={{ fontSize:12, color:"#8b8b9d", margin:"5px 0" }}>{fmt(g.current)} de {fmt(g.target)}</p>
              <div className="bar-bg"><div style={{ width:String(pct)+"%", height:"100%", background:"#4ade80" }}/></div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button className="btn" onClick={()=>onContributeGoal(g.id,100)} style={{ flex:1,padding:8,background:"#1f2937",color:"#a5b4fc" }}>+ R$100</button>
                <button className="btn" onClick={()=>onContributeGoal(g.id,500)} style={{ flex:1,padding:8,background:"#1f2937",color:"#a5b4fc" }}>+ R$500</button>
              </div>
            </div>
          );
        })}

        <div className="card">
          <p style={{ fontWeight:700, marginBottom:10 }}>Nova meta/reserva</p>
          <input className="input" placeholder="Nome" value={goalForm.name} onChange={e=>setGoalForm(f=>({...f,name:e.target.value}))} style={{ marginBottom:8 }}/>
          <input className="input" type="number" placeholder="Valor alvo" value={goalForm.target} onChange={e=>setGoalForm(f=>({...f,target:e.target.value}))} style={{ marginBottom:8 }}/>
          <input className="input" type="number" placeholder="Já guardado" value={goalForm.current} onChange={e=>setGoalForm(f=>({...f,current:e.target.value}))} style={{ marginBottom:8 }}/>
          <button className="btn" onClick={async()=>{ if(!goalForm.name) return; await onCreateGoal(goalForm); setGoalForm({name:"",target:"",current:""}); }}
            style={{ width:"100%", padding:12, background:"#6366f1", color:"#fff" }}>Criar</button>
        </div>
      </>}

      {section==="cartoes" && <>
        {cards.map(card => (
          <div className="card" key={card.id}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <strong>💳 {card.name}</strong>
              <button onClick={()=>onDeleteCard(card.id)} style={{ background:"none", border:0, color:"#6b7280" }}>✕</button>
            </div>
            <p style={{ fontSize:12, color:"#8b8b9d", marginTop:5 }}>
              fecha dia {card.closingDay} · vence dia {card.dueDay}{card.limit ? " · limite "+fmt(card.limit) : ""}
            </p>
          </div>
        ))}

        <div className="card">
          <p style={{ fontWeight:700, marginBottom:10 }}>Novo cartão</p>
          <input className="input" placeholder="Nome" value={cardForm.name} onChange={e=>setCardForm(f=>({...f,name:e.target.value}))} style={{ marginBottom:8 }}/>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input className="input" type="number" min="1" max="31" placeholder="Fechamento" value={cardForm.closingDay} onChange={e=>setCardForm(f=>({...f,closingDay:e.target.value}))}/>
            <input className="input" type="number" min="1" max="31" placeholder="Vencimento" value={cardForm.dueDay} onChange={e=>setCardForm(f=>({...f,dueDay:e.target.value}))}/>
          </div>
          <input className="input" type="number" placeholder="Limite (opcional)" value={cardForm.limit} onChange={e=>setCardForm(f=>({...f,limit:e.target.value}))} style={{ marginBottom:8 }}/>
          <button className="btn" onClick={async()=>{ if(!cardForm.name||!cardForm.closingDay||!cardForm.dueDay)return; await onCreateCard(cardForm); setCardForm({name:"",closingDay:"",dueDay:"",limit:""}); }}
            style={{ width:"100%", padding:12, background:"#6366f1", color:"#fff" }}>Salvar cartão</button>
        </div>

        {cards.length>0 && (
          <div className="card">
            <p style={{ fontWeight:700, marginBottom:10 }}>Registrar compra no cartão</p>
            <select className="select" value={purchaseForm.cardId} onChange={e=>setPurchaseForm(f=>({...f,cardId:e.target.value}))} style={{ marginBottom:8 }}>
              <option value="">Escolha o cartão</option>
              {cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="Descrição" value={purchaseForm.description} onChange={e=>setPurchaseForm(f=>({...f,description:e.target.value}))} style={{ marginBottom:8 }}/>
            <input className="input" type="number" placeholder="Valor total" value={purchaseForm.totalAmount} onChange={e=>setPurchaseForm(f=>({...f,totalAmount:e.target.value}))} style={{ marginBottom:8 }}/>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input className="input" type="date" value={purchaseForm.purchaseDate} onChange={e=>setPurchaseForm(f=>({...f,purchaseDate:e.target.value}))}/>
              <input className="input" type="number" min="1" max="48" placeholder="Parcelas" value={purchaseForm.installments} onChange={e=>setPurchaseForm(f=>({...f,installments:e.target.value}))}/>
            </div>
            <button className="btn" onClick={async()=>{ if(!purchaseForm.cardId||!purchaseForm.totalAmount)return; await onCreateCardPurchase(purchaseForm); setPurchaseForm(f=>({...f,description:"",totalAmount:"",installments:1})); }}
              style={{ width:"100%", padding:12, background:"#6366f1", color:"#fff" }}>Registrar compra</button>
          </div>
        )}

        {cardPurchases.slice().reverse().map(p=>(
          <div className="card" key={p.id} style={{ display:"flex", justifyContent:"space-between" }}>
            <div>
              <p style={{ fontWeight:600 }}>{p.description || "Compra"}</p>
              <p style={{ fontSize:11, color:"#6b7280" }}>{p.purchaseDate} · {p.installments}x</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p>{fmt(p.totalAmount)}</p>
              <button onClick={()=>onDeleteCardPurchase(p.id)} style={{ background:"none", border:0, color:"#6b7280" }}>remover</button>
            </div>
          </div>
        ))}
      </>}

      {section==="simular" && <>
        <div className="card" style={{ background:"linear-gradient(135deg,#251c34,#172036)" }}>
          <p style={{ fontSize:12, color:"#8b8b9d" }}>Teste uma compra sem salvar</p>
          <h2 style={{ fontSize:24, marginTop:4 }}>E se eu gastar {sim.amount ? fmt(sim.amount) : "R$ 0"}?</h2>
        </div>

        <div className="card">
          <input className="input" type="number" placeholder="Valor da compra" value={sim.amount} onChange={e=>setSim(f=>({...f,amount:e.target.value}))} style={{ marginBottom:8 }}/>
          <input className="input" type="date" value={sim.date} onChange={e=>setSim(f=>({...f,date:e.target.value}))} style={{ marginBottom:8 }}/>
          <input className="input" placeholder="Descrição" value={sim.description} onChange={e=>setSim(f=>({...f,description:e.target.value}))}/>
        </div>

        <div className="card">
          <p style={{ fontSize:12, color:"#8b8b9d" }}>Menor saldo sem a compra</p>
          <p style={{ fontSize:20, fontWeight:700 }}>{fmt(simulation.baseLowest)}</p>
          <p style={{ fontSize:12, color:"#8b8b9d", marginTop:12 }}>Menor saldo com a compra</p>
          <p style={{ fontSize:20, fontWeight:700, color:simulation.newLowest<0?"#f87171":"#4ade80" }}>{fmt(simulation.newLowest)}</p>
          <p style={{ fontSize:12, color:"#8b8b9d", marginTop:6 }}>Pior ponto em {simulation.date}. Impacto: {fmt(simulation.impact)}.</p>
          <p style={{ marginTop:12, fontWeight:700, color:simulation.newLowest<0?"#f87171":"#a5b4fc" }}>
            {simulation.newLowest<0 ? "⚠️ Essa compra faria o horizonte ficar negativo." : "✓ Pelo horizonte atual, a compra não leva o saldo abaixo de zero."}
          </p>
        </div>
      </>}
    </div>
  );
}
