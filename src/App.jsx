import { useState, useMemo, useRef, useEffect } from "react";
import { buildProjection } from "./services/projectionEngine";
import HorizonPage from "./pages/HorizonPage";
import PlanningPage from "./pages/PlanningPage";
import AuthGate from "./components/AuthGate";
import { listTransactions, createTransactions, deleteTransaction } from "./services/financeRepository";
import {
  listAccounts, createAccount, deleteAccount,
  listSavingsGoals, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
  listCards, createCard, deleteCard,
  listCardPurchases, createCardPurchase, deleteCardPurchase,
  buildCardProjectionTransactions,
} from "./services/planningRepository";
import { parseLocalDate, todayLocalIso, toLocalIso } from "./utils/dateUtils";

const CATEGORIES = {
  receita: ["Salário", "Freelance", "Investimentos", "Burgeria", "Outros"],
  despesa: ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Burgeria", "Outros"],
  diario: ["Combustível", "Farmácia", "Padaria", "Mercado", "Lazer", "Cuidados pessoais", "Outros"],
};

const COLORS = {
  Salário: "#4ade80", Freelance: "#34d399", Investimentos: "#6ee7b7",
  Moradia: "#f87171", Alimentação: "#fb923c", Transporte: "#fbbf24",
  Saúde: "#a78bfa", Lazer: "#60a5fa", Educação: "#38bdf8",
  Burgeria: "#f97316", Outros: "#94a3b8",
};

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Gera recorrências SEM duplicar transações que já existem naquele mês
function gerarRecorrencias(transactions, mes, ano) {
  const novas = [];
  const base = transactions.filter(t => {
    const d = parseLocalDate(t.data);
    return d.getMonth() === mes && d.getFullYear() === ano;
  });
  const idsBase = new Set(base.map(t => String(t.id).split("-")[0]));

  transactions.forEach(t => {
    if (!t.recorrente) return;
    const idBase = String(t.id).split("-")[0];
    // Se já existe uma transação original desse id neste mês, não duplica
    if (idsBase.has(idBase)) return;

    const dataOriginal = parseLocalDate(t.data);
    const fim = t.fimRecorrencia ? parseLocalDate(t.fimRecorrencia) : null;
    const diaOriginal = dataOriginal.getDate();
    const dataAtual = new Date(ano, mes, Math.min(diaOriginal, new Date(ano, mes + 1, 0).getDate()));

    if (fim && dataAtual > fim) return;
    if (dataAtual < dataOriginal) return;

    novas.push({
      ...t,
      id: `${idBase}-rec-${mes}-${ano}`,
      data: dataAtual.toISOString().split("T")[0],
    });
  });
  return novas;
}

const initialTransactions = [];

const initialMetas = [];

const initialOrcamento = {
  Moradia: 2000, Alimentação: 800, Transporte: 400, Saúde: 300,
  Lazer: 350, Educação: 200, Burgeria: 1500, Outros: 500,
};

const emptyForm = {
  tipo: "despesa", categoria: "", descricao: "", valor: "",
  data: todayLocalIso(),
  recorrente: false, tipoRecorrencia: "mensal", fimRecorrencia: "",
  parcelado: false, totalParcelas: 2,
};

// ── Import Sheet ─────────────────────────────────────────────────────────────
function ImportSheet({ onClose, onConfirm }) {
  const [step, setStep] = useState("upload");
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState([]);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const isImg = file.type.startsWith("image/");
    if (!isPdf && !isImg) { setError("Envie um PDF ou imagem (JPG, PNG, etc)."); return; }
    setError("");
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file);
    });
    setPreview({ name: file.name, type: isPdf ? "pdf" : "image", base64, mediaType: file.type });
  };

  const analyze = async () => {
    if (!preview) return;
    setStep("loading");
    setError("");

    try {
      const res = await fetch("/api/import-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: preview.base64,
          mediaType: preview.mediaType,
          kind: preview.type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível analisar o arquivo.");
        setStep("upload");
        return;
      }

      if (!data.transacoes?.length) {
        setError("Nenhuma transação encontrada.");
        setStep("upload");
        return;
      }

      const withIds = data.transacoes.map((t, i) => ({
        ...t,
        id: Date.now() + i,
        valor: Math.abs(parseFloat(t.valor) || 0),
      }));

      setExtracted(withIds);
      const sel = {};
      withIds.forEach(t => { sel[t.id] = true; });
      setSelected(sel);
      setStep("review");
    } catch {
      setError("Erro ao analisar. Tente novamente.");
      setStep("upload");
    }
  };

  const confirm = () => { onConfirm(extracted.filter(t => selected[t.id])); onClose(); };
  const toggleAll = (v) => { const s = {}; extracted.forEach(t => { s[t.id] = v; }); setSelected(s); };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
        {step === "upload" && (<>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>📎 Importar com IA</h3>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          <p style={{ fontSize:13, color:"#6b7280", marginBottom:16, lineHeight:1.6 }}>
            Envie um <strong style={{ color:"#a5b4fc" }}>extrato PDF</strong> ou <strong style={{ color:"#a5b4fc" }}>foto</strong> de boleto. O arquivo é processado pelo servidor; nenhuma chave de IA fica exposta no navegador.
          </p>
          <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}
            onClick={()=>fileRef.current.click()}
            style={{ border:`2px dashed ${dragOver||preview?"#6366f1":"#2a2a38"}`, borderRadius:16, padding:32, textAlign:"center", cursor:"pointer", background:dragOver?"rgba(99,102,241,0.08)":preview?"rgba(99,102,241,0.05)":"#111118", transition:"all 0.2s", marginBottom:12 }}>
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
            {preview ? (<>
              <p style={{ fontSize:36, marginBottom:8 }}>{preview.type==="pdf"?"📄":"🖼️"}</p>
              <p style={{ fontWeight:600, color:"#a5b4fc", fontSize:14 }}>{preview.name}</p>
              <p style={{ fontSize:12, color:"#4b5563", marginTop:4 }}>Toque para trocar</p>
            </>) : (<>
              <p style={{ fontSize:40, marginBottom:8 }}>📂</p>
              <p style={{ fontWeight:600, color:"#f1f5f9" }}>Toque para selecionar</p>
              <p style={{ fontSize:12, color:"#4b5563", marginTop:4 }}>PDF ou imagem (JPG, PNG)</p>
            </>)}
          </div>
          {error && <p style={{ color:"#f87171", fontSize:13, marginBottom:10, textAlign:"center" }}>{error}</p>}
          <button className="btn" onClick={analyze} disabled={!preview}
            style={{ background:preview?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#1e1e2e", color:preview?"#fff":"#4b5563", padding:14, fontSize:15, borderRadius:12, width:"100%" }}>
            ✨ Analisar com IA
          </button>
        </>)}

        {step === "loading" && (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <div style={{ fontSize:52, marginBottom:16, display:"inline-block", animation:"pulse 1s ease-in-out infinite" }}>🤖</div>
            <p style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Analisando documento...</p>
            <p style={{ color:"#6b7280", fontSize:13 }}>A IA está lendo e categorizando suas transações</p>
            <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
          </div>
        )}

        {step === "review" && (<>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>✅ Revisar</h3>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          <p style={{ fontSize:13, color:"#6b7280", marginBottom:12 }}>{extracted.length} transação(ões) encontrada(s).</p>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <button className="btn" onClick={()=>toggleAll(true)} style={{ flex:1, background:"#1a1a24", color:"#a5b4fc", padding:"7px 0", fontSize:12 }}>Todas</button>
            <button className="btn" onClick={()=>toggleAll(false)} style={{ flex:1, background:"#1a1a24", color:"#6b7280", padding:"7px 0", fontSize:12 }}>Nenhuma</button>
          </div>
          <div style={{ maxHeight:300, overflowY:"auto", marginBottom:12 }}>
            {extracted.map(t => (
              <div key={t.id} onClick={()=>setSelected(s=>({...s,[t.id]:!s[t.id]}))}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, marginBottom:6, cursor:"pointer", background:selected[t.id]?"rgba(99,102,241,0.1)":"#111118", border:`1px solid ${selected[t.id]?"#6366f1":"#1e1e2e"}`, transition:"all 0.15s" }}>
                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${selected[t.id]?"#6366f1":"#374151"}`, background:selected[t.id]?"#6366f1":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, color:"#fff", fontWeight:700 }}>
                  {selected[t.id]?"✓":""}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.descricao}</p>
                  <p style={{ fontSize:11, color:"#6b7280" }}>{t.categoria} · {t.data}</p>
                </div>
                <p style={{ fontWeight:700, color:t.tipo==="receita"?"#4ade80":"#f87171", fontSize:13, flexShrink:0 }}>
                  {t.tipo==="receita"?"+":"-"}{fmt(t.valor)}
                </p>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn" onClick={()=>{setStep("upload");setPreview(null)}} style={{ flex:1, background:"#1a1a24", color:"#6b7280", padding:12, fontSize:13 }}>← Voltar</button>
            <button className="btn" onClick={confirm} style={{ flex:2, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", padding:12, fontSize:14 }}>
              Importar {Object.values(selected).filter(Boolean).length}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
function FinanceApp({ user, onSignOut }) {
  const [tab, setTab] = useState("dashboard");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [metas, setMetas] = useState(initialMetas);
  const [orcamento, setOrcamento] = useState(initialOrcamento);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [metaForm, setMetaForm] = useState({ nome:"", alvo:"", atual:"", cor:"#6366f1" });
  const [filtroMes, setFiltroMes] = useState(() => new Date().getMonth());
  const [filtroAno, setFiltroAno] = useState(() => new Date().getFullYear());
  const [aporteMeta, setAporteMeta] = useState({});
  const [importSuccess, setImportSuccess] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [formError, setFormError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardPurchases, setCardPurchases] = useState([]);

  useEffect(() => {
    let active = true;
    setDataLoading(true);

    Promise.all([
      listTransactions(),
      listAccounts(),
      listSavingsGoals(),
      listCards(),
      listCardPurchases(),
    ])
      .then(([remoteTransactions, remoteAccounts, remoteGoals, remoteCards, remotePurchases]) => {
        if (!active) return;
        setTransactions(remoteTransactions);
        setAccounts(remoteAccounts);
        setSavingsGoals(remoteGoals);
        setCards(remoteCards);
        setCardPurchases(remotePurchases);
      })
      .catch((error) => {
        console.error("Erro ao carregar dados financeiros", error);
        if (active) setDataError("Não consegui carregar todos os seus dados do banco.");
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => { active = false; };
  }, []);

  const transacoesMes = useMemo(() => {
    const base = transactions.filter(t => {
      const d = parseLocalDate(t.data);
      return d.getMonth() === filtroMes && d.getFullYear() === filtroAno;
    });
    const recorrentes = gerarRecorrencias(transactions, filtroMes, filtroAno);
    return [...base, ...recorrentes];
  }, [transactions, filtroMes, filtroAno]);

  const totalReceitas = useMemo(() => transacoesMes.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0), [transacoesMes]);
  const totalDespesas = useMemo(() => transacoesMes.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0), [transacoesMes]);
  const saldo = totalReceitas - totalDespesas;

  // Receitas futuras já lançadas no mês filtrado que ainda não chegaram
  const hoje = new Date();
  const estesMesAno = filtroMes === hoje.getMonth() && filtroAno === hoje.getFullYear();
  const receitasFuturas = estesMesAno
    ? transacoesMes.filter(t => t.tipo === "receita" && parseLocalDate(t.data) > hoje).reduce((s, t) => s + t.valor, 0)
    : 0;
  const despesasFuturas = estesMesAno
    ? transacoesMes.filter(t => t.tipo === "despesa" && parseLocalDate(t.data) > hoje).reduce((s, t) => s + t.valor, 0)
    : 0;

  // Saldo real = o que já entrou menos o que já saiu
  const receitasReais = totalReceitas - receitasFuturas;
  const despesasReais = totalDespesas - despesasFuturas;
  const saldoReal = receitasReais - despesasReais;

  // Dias restantes no mês filtrado
  const ultimoDiaMes = new Date(filtroAno, filtroMes + 1, 0).getDate();
  const diaAtual = estesMesAno ? hoje.getDate() : ultimoDiaMes;
  const diasRestantes = ultimoDiaMes - diaAtual;
  // Saldo projetado = saldo atual + receitas futuras - despesas futuras
  const saldoProjetado = saldo;
  const limiteDiario = diasRestantes > 0 ? saldoProjetado / diasRestantes : saldoProjetado;

  const porcentagemGasto = totalReceitas > 0 ? totalDespesas / totalReceitas : 0;

  const gastosPorCategoria = useMemo(() => {
    const map = {};
    transacoesMes.filter(t => t.tipo === "despesa").forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + t.valor; });
    return map;
  }, [transacoesMes]);

  const addTransaction = async () => {
    setFormError("");
    if (!form.categoria) {
      setFormError("Selecione uma categoria para continuar.");
      return;
    }
    if (!form.valor || Number(form.valor) <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    if (!form.data) {
      setFormError("Escolha a data.");
      return;
    }

    const valor = parseFloat(form.valor);
    setDataError("");

    try {
      let pending;
      if (form.tipo !== "diario" && form.parcelado && parseInt(form.totalParcelas) > 1) {
        pending = Array.from({ length: parseInt(form.totalParcelas) }, (_, i) => {
          const d = parseLocalDate(form.data);
          d.setMonth(d.getMonth() + i);
          return {
            ...form,
            valor: parseFloat((valor / form.totalParcelas).toFixed(2)),
            descricao: `${form.descricao || form.categoria} (${i+1}/${form.totalParcelas})`,
            data: d.toISOString().split("T")[0],
            parcelado: true,
            recorrente: false,
            numeroParcela: i + 1,
            totalParcelas: parseInt(form.totalParcelas),
          };
        });
      } else {
        pending = [{ ...form, valor }];
      }

      const saved = await createTransactions(pending);
      setTransactions(prev => [...prev, ...saved]);
      setForm(emptyForm);
      setFormError("");
      setShowForm(false);
      setSaveSuccess(form.tipo === "diario" ? "Diário salvo com sucesso!" : "Movimentação salva com sucesso!");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (error) {
      console.error("Erro ao salvar movimentação", error);
      setDataError("Não consegui salvar essa movimentação. Tente novamente.");
    }
  };

  const handleImportConfirm = async (newTs) => {
    if (!newTs.length) return;
    setDataError("");
    try {
      const saved = await createTransactions(newTs);
      setTransactions(prev => [...prev, ...saved]);
      setImportSuccess(saved.length);
      setTimeout(() => setImportSuccess(0), 3500);
      const d = parseLocalDate(saved[0].data);
      setFiltroMes(d.getMonth()); setFiltroAno(d.getFullYear()); setTab("transacoes");
    } catch (error) {
      console.error("Erro ao importar movimentações", error);
      setDataError("A importação foi lida, mas não consegui salvar no banco.");
    }
  };

  const removeTransaction = async (id) => {
    const transaction = transactions.find(t => t.id === id);
    const label = transaction?.descricao || transaction?.categoria || "esta movimentação";
    if (!window.confirm(`Remover "${label}"? Essa ação não pode ser desfeita.`)) return;

    setDataError("");
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSaveSuccess("Movimentação removida.");
      setTimeout(() => setSaveSuccess(""), 2200);
    } catch (error) {
      console.error("Erro ao remover movimentação", error);
      setDataError("Não consegui remover essa movimentação.");
    }
  };

  const addMeta = () => {
    if (!metaForm.nome || !metaForm.alvo) return;
    setMetas(prev => [...prev, { ...metaForm, id: Date.now(), alvo: parseFloat(metaForm.alvo), atual: parseFloat(metaForm.atual || 0) }]);
    setMetaForm({ nome:"", alvo:"", atual:"", cor:"#6366f1" }); setShowMetaForm(false);
  };
  const aportarMeta = (id) => {
    const val = parseFloat(aporteMeta[id] || 0); if (!val) return;
    setMetas(prev => prev.map(m => m.id === id ? { ...m, atual: Math.min(m.atual + val, m.alvo) } : m));
    setAporteMeta(prev => ({ ...prev, [id]: "" }));
  };
  const removeMeta = (id) => setMetas(prev => prev.filter(m => m.id !== id));
  const totalOrcamento = Object.values(orcamento).reduce((s, v) => s + v, 0);

  const handleCreateAccount = async (account) => {
    try {
      const saved = await createAccount(account);
      setAccounts(prev => [...prev, saved]);
      setSaveSuccess("Conta salva com sucesso!");
      setTimeout(() => setSaveSuccess(""), 2500);
    } catch (error) {
      console.error(error);
      setDataError("Não consegui salvar essa conta.");
    }
  };

  const handleDeleteAccount = async (id) => {
    try {
      await deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error(error);
      setDataError("Não consegui remover essa conta.");
    }
  };

  const handleCreateGoal = async (goal) => {
    try {
      const saved = await createSavingsGoal(goal);
      setSavingsGoals(prev => [...prev, saved]);
    } catch (error) {
      console.error(error);
      setDataError("Não consegui criar essa reserva.");
    }
  };

  const handleUpdateGoal = async (id, patch) => {
    try {
      const saved = await updateSavingsGoal(id, patch);
      setSavingsGoals(prev => prev.map(g => g.id === id ? saved : g));
    } catch (error) {
      console.error(error);
      setDataError("Não consegui atualizar essa reserva.");
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      await deleteSavingsGoal(id);
      setSavingsGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error(error);
      setDataError("Não consegui remover essa reserva.");
    }
  };

  const handleContributeGoal = async (id, amount) => {
    const value = Number(amount) || 0;
    if (value <= 0) return;

    const goal = savingsGoals.find(g => g.id === id);
    if (!goal) return;

    try {
      const [savedGoal, savedTransactions] = await Promise.all([
        updateSavingsGoal(id, { current: goal.current + value }),
        createTransactions([{
          tipo: "economia",
          categoria: "Reserva",
          descricao: "Aporte - " + goal.name,
          valor: value,
          data: new Date().toISOString().split("T")[0],
          recorrente: false,
        }]),
      ]);

      setSavingsGoals(prev => prev.map(g => g.id === id ? savedGoal : g));
      setTransactions(prev => [...prev, ...savedTransactions]);
      setSaveSuccess("Aporte registrado: saiu do caixa e entrou no patrimônio.");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (error) {
      console.error(error);
      setDataError("Não consegui registrar esse aporte.");
    }
  };

  const handleCreateCard = async (card) => {
    try {
      const saved = await createCard(card);
      setCards(prev => [...prev, saved]);
    } catch (error) {
      console.error(error);
      setDataError("Não consegui salvar esse cartão.");
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      await deleteCard(id);
      setCards(prev => prev.filter(card => card.id !== id));
      setCardPurchases(prev => prev.filter(p => p.cardId !== id));
    } catch (error) {
      console.error(error);
      setDataError("Não consegui remover esse cartão.");
    }
  };

  const handleCreateCardPurchase = async (purchase) => {
    try {
      const saved = await createCardPurchase(purchase);
      setCardPurchases(prev => [...prev, saved]);
      setSaveSuccess("Compra adicionada à projeção do cartão!");
      setTimeout(() => setSaveSuccess(""), 2500);
    } catch (error) {
      console.error(error);
      setDataError("Não consegui registrar essa compra.");
    }
  };

  const handleDeleteCardPurchase = async (id) => {
    try {
      await deleteCardPurchase(id);
      setCardPurchases(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error(error);
      setDataError("Não consegui remover essa compra.");
    }
  };

  const cardProjectionTransactions = useMemo(
    () => buildCardProjectionTransactions(cards, cardPurchases),
    [cards, cardPurchases]
  );

  const availableAccountBalance = useMemo(
    () => accounts.filter(account => account.includeInAvailable).reduce((sum, account) => sum + (Number(account.balance) || 0), 0),
    [accounts]
  );

  const nextIncome = useMemo(() => {
    const today = parseLocalDate(todayLocalIso());
    return transactions
      .filter(t => t.tipo === "receita" && parseLocalDate(t.data) >= today)
      .slice()
      .sort((a,b) => parseLocalDate(a.data) - parseLocalDate(b.data))[0] || null;
  }, [transactions]);

  const projection = useMemo(() => {
    const start = parseLocalDate(todayLocalIso());
    const end = parseLocalDate(start);
    end.setMonth(end.getMonth() + 6);

    const availableBalance = accounts
      .filter(account => account.includeInAvailable)
      .reduce((sum, account) => sum + (Number(account.balance) || 0), 0);

    return buildProjection({
      transactions: [...transactions, ...cardProjectionTransactions],
      initialBalance: availableBalance,
      startDate: toLocalIso(start),
      endDate: toLocalIso(end),
    });
  }, [transactions, accounts, cardProjectionTransactions]);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0f0f14", minHeight:"100vh", color:"#f1f5f9", maxWidth:430, margin:"0 auto", position:"relative", paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{display:none}
        input,select{outline:none}
        .card{background:#1a1a24;border-radius:16px;padding:16px;margin-bottom:12px}
        .pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .btn{border:none;cursor:pointer;font-family:inherit;font-weight:600;border-radius:12px;transition:opacity 0.15s}
        .btn:active{opacity:0.7}
        .input{background:#111118;border:1px solid #2a2a38;border-radius:10px;color:#f1f5f9;font-family:inherit;padding:10px 12px;width:100%;font-size:14px}
        .input:focus{border-color:#6366f1}
        .select{background:#111118;border:1px solid #2a2a38;border-radius:10px;color:#f1f5f9;font-family:inherit;padding:10px 12px;width:100%;font-size:14px;appearance:none}
        .bar-bg{background:#1e1e2e;border-radius:8px;overflow:hidden;height:8px}
        .fade-in{animation:fadeIn 0.3s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:50;display:flex;align-items:flex-end;justify-content:center;padding:0;width:100vw;height:100dvh;overflow:hidden}
        .sheet{background:#16161f;border-radius:20px 20px 0 0;padding:24px;width:min(100%,430px);max-height:92dvh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;box-shadow:0 -14px 40px rgba(0,0,0,.35)}
        .sheet input,.sheet select,.sheet button{max-width:100%}
        .toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;padding:12px 20px;border-radius:12px;font-weight:600;font-size:14px;z-index:100;animation:fadeIn 0.3s ease;white-space:normal;width:max-content;max-width:calc(100vw - 32px);text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.4)}
        @media (min-width:700px){
          .overlay{align-items:center;padding:24px}
          .sheet{width:min(520px,calc(100vw - 48px));max-height:calc(100dvh - 48px);border-radius:20px;padding:26px}
        }
        @media (max-width:420px){
          .sheet{padding:20px 16px;max-height:94dvh}
        }
        .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #1e1e2e}
        .toggle{width:42px;height:24px;border-radius:12px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0}
        .toggle-knob{position:absolute;top:3px;width:18px;height:18px;border-radius:9px;background:#fff;transition:left 0.2s}
        .section-label{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px}
      `}</style>

      {importSuccess > 0 && <div className="toast">✅ {importSuccess} transação(ões) importada(s)!</div>}
      {saveSuccess && <div className="toast">✅ {saveSuccess}</div>}
      {dataError && (
        <div style={{ margin:"12px 16px", padding:"10px 12px", background:"rgba(248,113,113,.12)", color:"#fca5a5", border:"1px solid rgba(248,113,113,.25)", borderRadius:12, fontSize:12 }}>
          {dataError}
        </div>
      )}
      {dataLoading && (
        <div style={{ margin:"12px 16px", padding:"10px 12px", background:"#1a1a24", color:"#8b8b9d", borderRadius:12, fontSize:12 }}>
          Sincronizando com o Neon...
        </div>
      )}

      {/* Header */}
      <div style={{ padding:"24px 20px 12px", background:"linear-gradient(180deg,#13131d 0%,transparent 100%)", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ fontSize:12, color:"#6b7280", fontWeight:500 }}>Minhas Finanças</p>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>
              {tab==="dashboard"?"Resumo":tab==="horizonte"?"Horizonte":tab==="transacoes"?"Transações":tab==="planejar"?"Planejar":"Metas"}
            </h1>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button
              className="btn"
              onClick={onSignOut}
              title={user?.email || "Sair"}
              style={{ background:"#1a1a24", color:"#a5b4fc", width:38, height:38, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}
            >↪</button>
            {tab==="transacoes" && (<>
              <button className="btn" onClick={()=>setShowImport(true)}
                style={{ background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)", color:"#a5b4fc", width:38, height:38, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>📎</button>
              <button className="btn" onClick={()=>{setForm(emptyForm);setFormError("");setShowForm(true)}}
                style={{ background:"#6366f1", color:"#fff", width:38, height:38, fontSize:22, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
            </>)}
            {tab==="metas" && (
              <button className="btn" onClick={()=>setShowMetaForm(true)}
                style={{ background:"#6366f1", color:"#fff", width:38, height:38, fontSize:22, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
            )}
          </div>
        </div>
        {(tab==="dashboard"||tab==="transacoes"||tab==="horizonte") && (
          <div style={{ display:"flex", gap:8, marginTop:12, overflowX:"auto", paddingBottom:4 }}>
            {MONTHS.map((m,i) => (
              <button key={i} className="btn" onClick={()=>setFiltroMes(i)}
                style={{ background:filtroMes===i?"#6366f1":"#1a1a24", color:filtroMes===i?"#fff":"#6b7280", padding:"5px 12px", borderRadius:20, fontSize:12, whiteSpace:"nowrap", flexShrink:0 }}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:"0 16px" }} className="fade-in">

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (<>

          {/* Visão principal baseada nas contas e no Horizonte */}
          <div style={{ background:"#1a1a24", borderRadius:20, padding:20, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:16, alignItems:"flex-start" }}>
              <div>
                <p style={{ fontSize:11, color:"#6b7280" }}>Saldo disponível nas contas</p>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:availableAccountBalance>=0?"#f1f5f9":"#f87171" }}>
                  {fmt(availableAccountBalance)}
                </h2>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:11, color:"#6b7280" }}>Menor saldo futuro</p>
                <p style={{ fontSize:18, fontWeight:700, color:projection.lowestBalance<0?"#f87171":projection.lowestBalance<500?"#fbbf24":"#4ade80" }}>
                  {fmt(projection.lowestBalance)}
                </p>
              </div>
            </div>
            <div style={{ marginTop:12, display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <p style={{ fontSize:12, color:"#6b7280" }}>
                Pior ponto: <strong style={{ color:"#f1f5f9" }}>{formatDateBr(projection.lowestBalanceDate)}</strong>
              </p>
              {nextIncome && (
                <p style={{ fontSize:12, color:"#6b7280" }}>
                  Próxima entrada: <strong style={{ color:"#4ade80" }}>+{fmt(nextIncome.valor)}</strong> em {formatDateBr(nextIncome.data)}
                </p>
              )}
            </div>
            {accounts.length===0 && (
              <button className="btn" onClick={()=>setTab("planejar")} style={{ marginTop:12, width:"100%", padding:10, background:"#242438", color:"#a5b4fc" }}>
                Cadastre uma conta para o Horizonte começar do seu saldo real
              </button>
            )}
          </div>

          {porcentagemGasto > 0.8 && (
            <div style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:12, padding:"10px 14px", marginBottom:12, color:"#f87171", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
              ⚠️ Você já gastou mais de {Math.round(porcentagemGasto*100)}% da sua renda
            </div>
          )}

          <button className="btn" onClick={()=>{setTab("transacoes");setShowImport(true)}}
            style={{ width:"100%", background:"linear-gradient(135deg,rgba(249,115,22,0.12),rgba(251,146,60,0.08))", border:"1px solid rgba(249,115,22,0.25)", color:"#fb923c", padding:"12px 16px", borderRadius:14, display:"flex", alignItems:"center", gap:10, marginBottom:12, fontSize:13 }}>
            <span style={{ fontSize:22 }}>📎</span>
            <div style={{ textAlign:"left" }}>
              <p style={{ fontWeight:700 }}>Importar extrato ou boleto</p>
              <p style={{ fontSize:11, color:"#6b7280", fontWeight:400 }}>PDF ou foto — processamento protegido no servidor</p>
            </div>
            <span style={{ marginLeft:"auto" }}>→</span>
          </button>

          {/* Burgeria highlight */}
          {(() => {
            const bR = transacoesMes.filter(t=>t.tipo==="receita"&&t.categoria==="Burgeria").reduce((s,t)=>s+t.valor,0);
            const bD = transacoesMes.filter(t=>t.tipo==="despesa"&&t.categoria==="Burgeria").reduce((s,t)=>s+t.valor,0);
            if (!bR && !bD) return null;
            const lucro = bR - bD;
            return (
              <div style={{ background:"linear-gradient(135deg,rgba(249,115,22,0.15),rgba(234,88,12,0.1))", border:"1px solid rgba(249,115,22,0.3)", borderRadius:16, padding:16, marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:18 }}>🍔</span>
                  <p style={{ fontWeight:700, fontSize:14, color:"#fb923c" }}>Burgeria — este mês</p>
                </div>
                <div style={{ display:"flex", gap:16 }}>
                  <div><p style={{ fontSize:11, color:"#6b7280" }}>Entradas</p><p style={{ fontWeight:700, color:"#4ade80", fontSize:14 }}>+{fmt(bR)}</p></div>
                  <div><p style={{ fontSize:11, color:"#6b7280" }}>Custos</p><p style={{ fontWeight:700, color:"#f87171", fontSize:14 }}>-{fmt(bD)}</p></div>
                  <div><p style={{ fontSize:11, color:"#6b7280" }}>Resultado</p><p style={{ fontWeight:700, color:lucro>=0?"#4ade80":"#f87171", fontSize:14 }}>{fmt(lucro)}</p></div>
                </div>
              </div>
            );
          })()}

          {/* Saldo do mês */}
          <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:20, padding:20, marginBottom:12 }}>
            <p style={{ fontSize:12, color:"rgba(255,255,255,0.7)", fontWeight:500 }}>Saldo do mês</p>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800, margin:"4px 0" }}>{fmt(saldo)}</h2>
            <div style={{ display:"flex", gap:20, marginTop:8 }}>
              <div><p style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>Receitas</p><p style={{ fontWeight:700, color:"#4ade80", fontSize:15 }}>+{fmt(totalReceitas)}</p></div>
              <div><p style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>Despesas</p><p style={{ fontWeight:700, color:"#f87171", fontSize:15 }}>-{fmt(totalDespesas)}</p></div>
            </div>
          </div>

          <div className="card">
            <p style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Gastos por Categoria</p>
            {Object.keys(gastosPorCategoria).length===0 ? (
              <p style={{ color:"#4b5563", fontSize:13, textAlign:"center", padding:"12px 0" }}>Nenhuma despesa neste mês</p>
            ) : Object.entries(gastosPorCategoria).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
              const pct = totalDespesas>0?(val/totalDespesas)*100:0;
              return (
                <div key={cat} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13 }}>{cat==="Burgeria"?"🍔 ":""}{cat}</span>
                    <span style={{ fontSize:13, fontWeight:600 }}>{fmt(val)}</span>
                  </div>
                  <div className="bar-bg"><div style={{ width:`${pct}%`, background:COLORS[cat]||"#94a3b8", height:"100%", borderRadius:8 }}/></div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ fontWeight:600, fontSize:14 }}>Patrimônio e reservas</p>
              <button className="btn" onClick={()=>setTab("planejar")} style={{ background:"none", color:"#a5b4fc", fontSize:11 }}>ver tudo</button>
            </div>
            {savingsGoals.length===0 ? (
              <p style={{ color:"#4b5563", fontSize:13, textAlign:"center", padding:"12px 0" }}>Nenhuma reserva criada ainda</p>
            ) : savingsGoals.slice(0,3).map(g => {
              const pct = g.target > 0 ? Math.min((g.current/g.target)*100,100) : 0;
              return (
                <div key={g.id} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13 }}>{g.name}</span>
                    <span style={{ fontSize:12, color:"#6b7280" }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="bar-bg"><div style={{ width:`${pct}%`, background:"#4ade80", height:"100%", borderRadius:8 }}/></div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                    <span style={{ fontSize:11, color:"#4b5563" }}>{fmt(g.current)}</span>
                    <span style={{ fontSize:11, color:"#4b5563" }}>{fmt(g.target)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <p style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Últimas Transações</p>
            {transacoesMes.slice(-5).reverse().map(t => (
              <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #1e1e2e" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:t.categoria==="Burgeria"?"rgba(249,115,22,0.15)":t.tipo==="receita"?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                    {t.categoria==="Burgeria"?"🍔":t.tipo==="receita"?"💰":"💸"}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:500 }}>{t.descricao||t.categoria}</p>
                    <p style={{ fontSize:11, color:"#4b5563" }}>{t.categoria}{t.recorrente?" 🔁":""}{t.parcelado?" 💳":""}</p>
                  </div>
                </div>
                <p style={{ fontWeight:600, color:t.tipo==="receita"?"#4ade80":"#f87171", fontSize:14 }}>
                  {t.tipo==="receita"?"+":"-"}{fmt(t.valor)}
                </p>
              </div>
            ))}
          </div>
        </>)}

        {/* ── HORIZONTE ── */}
        {tab==="horizonte" && (
          <HorizonPage projection={projection} />
        )}

        {/* ── PLANEJAR ── */}
        {tab==="planejar" && (
          <PlanningPage
            accounts={accounts}
            savingsGoals={savingsGoals}
            cards={cards}
            cardPurchases={cardPurchases}
            baseTransactions={transactions}
            cardProjectionTransactions={cardProjectionTransactions}
            onCreateAccount={handleCreateAccount}
            onDeleteAccount={handleDeleteAccount}
            onCreateGoal={handleCreateGoal}
            onUpdateGoal={handleUpdateGoal}
            onContributeGoal={handleContributeGoal}
            onDeleteGoal={handleDeleteGoal}
            onCreateCard={handleCreateCard}
            onDeleteCard={handleDeleteCard}
            onCreateCardPurchase={handleCreateCardPurchase}
            onDeleteCardPurchase={handleDeleteCardPurchase}
          />
        )}

        {/* ── TRANSAÇÕES ── */}
        {tab==="transacoes" && (<>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <div style={{ flex:1, background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:12, padding:12, textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#4b5563" }}>Receitas</p>
              <p style={{ fontWeight:700, color:"#4ade80", fontSize:15 }}>{fmt(totalReceitas)}</p>
            </div>
            <div style={{ flex:1, background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:12, padding:12, textAlign:"center" }}>
              <p style={{ fontSize:11, color:"#4b5563" }}>Despesas</p>
              <p style={{ fontWeight:700, color:"#f87171", fontSize:15 }}>{fmt(totalDespesas)}</p>
            </div>
          </div>
          <button className="btn" onClick={()=>setShowImport(true)}
            style={{ width:"100%", background:"rgba(99,102,241,0.08)", border:"1px dashed rgba(99,102,241,0.4)", color:"#a5b4fc", padding:"11px 16px", borderRadius:12, display:"flex", alignItems:"center", gap:8, marginBottom:12, fontSize:13 }}>
            <span>📎</span> Importar extrato ou boleto com IA
          </button>
          {transacoesMes.length===0 ? (
            <div className="card" style={{ textAlign:"center", padding:32 }}>
              <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
              <p style={{ color:"#4b5563" }}>Nenhuma transação neste mês</p>
            </div>
          ) : [...transacoesMes].reverse().map(t => (
            <div key={t.id} className="card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:t.categoria==="Burgeria"?"rgba(249,115,22,0.15)":t.tipo==="receita"?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                  {t.categoria==="Burgeria"?"🍔":t.tipo==="receita"?"💰":"💸"}
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:500 }}>{t.descricao||t.categoria}</p>
                  <p style={{ fontSize:11, color:"#6b7280" }}>
                    {t.categoria}{t.recorrente?" · 🔁 Recorrente":""}{t.parcelado?" · 💳 Parcelado":""} · {t.data}
                  </p>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                <p style={{ fontWeight:700, color:t.tipo==="receita"?"#4ade80":"#f87171" }}>
                  {t.tipo==="receita"?"+":"-"}{fmt(t.valor)}
                </p>
                <button onClick={()=>removeTransaction(t.id)} style={{ background:"none", border:"none", color:"#374151", cursor:"pointer", fontSize:16 }}>🗑</button>
              </div>
            </div>
          ))}
        </>)}

        {/* ── ORÇAMENTO ── */}
        {tab==="orcamento" && (<>
          <div style={{ background:"linear-gradient(135deg,#1e1e2e,#16213e)", borderRadius:20, padding:20, marginBottom:12 }}>
            <p style={{ fontSize:12, color:"#6b7280" }}>Orçamento Total</p>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800 }}>{fmt(totalOrcamento)}</h2>
            <p style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>Gasto: {fmt(totalDespesas)} · Restante: <span style={{ color:(totalOrcamento-totalDespesas)>=0?"#4ade80":"#f87171" }}>{fmt(totalOrcamento-totalDespesas)}</span></p>
          </div>
          {Object.entries(orcamento).map(([cat,limite]) => {
            const gasto = gastosPorCategoria[cat]||0;
            const pct = limite>0?Math.min((gasto/limite)*100,100):0;
            const over = gasto>limite;
            const cor = over?"#f87171":pct>75?"#fbbf24":cat==="Burgeria"?"#f97316":"#4ade80";
            return (
              <div key={cat} className="card">
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{cat==="Burgeria"?"🍔 ":""}{cat}</span>
                  {over&&<span className="pill" style={{ background:"rgba(248,113,113,0.15)", color:"#f87171" }}>Estourado!</span>}
                </div>
                <div className="bar-bg" style={{ marginBottom:8 }}><div style={{ width:`${pct}%`, background:cor, height:"100%", borderRadius:8, transition:"width 0.5s" }}/></div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"#6b7280" }}>{fmt(gasto)} / {fmt(limite)}</span>
                  <input className="input" type="number" value={orcamento[cat]}
                    onChange={e=>setOrcamento(prev=>({...prev,[cat]:parseFloat(e.target.value)||0}))}
                    style={{ width:90, padding:"4px 8px", fontSize:13, textAlign:"right" }}/>
                </div>
              </div>
            );
          })}
        </>)}

        {/* ── METAS ── */}
        {tab==="metas" && (<>
          {metas.map(m => {
            const pct = Math.min((m.atual/m.alvo)*100,100);
            const concluida = pct>=100;
            return (
              <div key={m.id} className="card">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <p style={{ fontWeight:600, fontSize:15 }}>{m.nome}</p>
                    <p style={{ fontSize:12, color:"#6b7280" }}>{fmt(m.atual)} de {fmt(m.alvo)}</p>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {concluida&&<span className="pill" style={{ background:"rgba(74,222,128,0.15)", color:"#4ade80" }}>✓ Concluída</span>}
                    <button onClick={()=>removeMeta(m.id)} style={{ background:"none", border:"none", color:"#374151", cursor:"pointer", fontSize:16 }}>🗑</button>
                  </div>
                </div>
                <div style={{ background:"#111118", borderRadius:10, height:12, overflow:"hidden", marginBottom:10 }}>
                  <div style={{ width:`${pct}%`, background:m.cor, height:"100%", borderRadius:10, transition:"width 0.5s ease" }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:13 }}>
                  <span style={{ color:"#6b7280" }}>Progresso: <strong style={{ color:"#f1f5f9" }}>{pct.toFixed(1)}%</strong></span>
                  <span style={{ color:"#6b7280" }}>Faltam: <strong style={{ color:m.cor }}>{fmt(Math.max(m.alvo-m.atual,0))}</strong></span>
                </div>
                {!concluida && (
                  <div style={{ display:"flex", gap:8 }}>
                    <input className="input" type="number" placeholder="Valor do aporte" value={aporteMeta[m.id]||""} onChange={e=>setAporteMeta(prev=>({...prev,[m.id]:e.target.value}))} style={{ flex:1 }}/>
                    <button className="btn" onClick={()=>aportarMeta(m.id)} style={{ background:m.cor, color:"#fff", padding:"10px 14px", fontSize:13 }}>Aportar</button>
                  </div>
                )}
              </div>
            );
          })}
          {metas.length===0&&(
            <div className="card" style={{ textAlign:"center", padding:32 }}>
              <p style={{ fontSize:32, marginBottom:8 }}>🎯</p>
              <p style={{ color:"#4b5563" }}>Nenhuma meta criada ainda</p>
            </div>
          )}
        </>)}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"#13131d", borderTop:"1px solid #1e1e2e", display:"flex", padding:"8px 0 16px" }}>
        {[
          { id:"dashboard", icon:"📊", label:"Resumo" },
          { id:"horizonte", icon:"🔭", label:"Horizonte" },
          { id:"transacoes", icon:"💸", label:"Movimentos" },
          { id:"planejar", icon:"🧭", label:"Planejar" },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} className="btn"
            style={{ flex:1, background:"none", color:tab===t.id?"#a5b4fc":"#4b5563", fontSize:10, fontWeight:600, padding:"4px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {showImport&&<ImportSheet onClose={()=>setShowImport(false)} onConfirm={handleImportConfirm}/>}

      {/* ── Form Nova Transação ── */}
      {showForm && (
        <div className="overlay" onClick={()=>setShowForm(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, marginBottom:16 }}>Nova Transação</h3>

            {/* Tipo */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {["despesa","receita","diario"].map(tipo => (
                <button key={tipo} className="btn" onClick={()=>setForm(f=>({...f,tipo,categoria:""}))}
                  style={{ flex:1, padding:10, background:form.tipo===tipo?(tipo==="receita"?"rgba(74,222,128,0.2)":tipo==="diario"?"rgba(165,180,252,0.16)":"rgba(248,113,113,0.2)"):"#1a1a24", color:form.tipo===tipo?(tipo==="receita"?"#4ade80":tipo==="diario"?"#a5b4fc":"#f87171"):"#6b7280", border:form.tipo===tipo?`1px solid ${tipo==="receita"?"#4ade80":tipo==="diario"?"#6366f1":"#f87171"}`:"1px solid transparent", fontSize:12 }}>
                  {tipo==="receita"?"💰 Receita":tipo==="diario"?"🗓️ Diário":"💸 Despesa"}
                </button>
              ))}
            </div>

            {/* Campos principais */}
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
              <select className="select" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                <option value="">Categoria</option>
                {(CATEGORIES[form.tipo] || []).map(c=><option key={c} value={c}>{c==="Burgeria"?"🍔 Burgeria":c}</option>)}
              </select>
              <input className="input" placeholder="Descrição (opcional)" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
              <input className="input" type="number" placeholder={form.tipo==="diario"?"Orçamento mensal (R$)":"Valor (R$)"} value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/>
              {form.tipo==="diario" && (
                <p style={{ fontSize:11, color:"#6b7280", lineHeight:1.5 }}>
                  Cadastre aqui os gastos variáveis do mês, como combustível, farmácia e padaria. O total será dividido pelos dias do mês no Horizonte.
                </p>
              )}
              <input className="input" type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
            </div>

            {/* Toggles */}
            <p className="section-label">Opções</p>

            {/* Recorrente */}
            <div className="toggle-row">
              <div>
                <p style={{ fontSize:14, fontWeight:500 }}>🔁 Recorrente</p>
                <p style={{ fontSize:12, color:"#6b7280" }}>Repete todo mês automaticamente</p>
              </div>
              <button className="toggle" onClick={()=>setForm(f=>({...f,recorrente:!f.recorrente,parcelado:false}))}
                style={{ background:form.recorrente?"#6366f1":"#2a2a38" }}>
                <div className="toggle-knob" style={{ left:form.recorrente?21:3 }}/>
              </button>
            </div>

            {form.recorrente && (
              <div style={{ paddingLeft:0, marginTop:8, marginBottom:8, display:"flex", flexDirection:"column", gap:8 }}>
                <select className="select" value={form.tipoRecorrencia} onChange={e=>setForm(f=>({...f,tipoRecorrencia:e.target.value}))}>
                  <option value="mensal">Mensal</option>
                  <option value="semanal">Semanal</option>
                </select>
                <input className="input" type="date" value={form.fimRecorrencia} onChange={e=>setForm(f=>({...f,fimRecorrencia:e.target.value}))}
                  placeholder="Data final (opcional)"/>
                <p style={{ fontSize:11, color:"#6b7280" }}>Data final da recorrência (deixe vazio para sem prazo)</p>
              </div>
            )}

            {/* Parcelado */}
            {!form.recorrente && form.tipo!=="diario" && (
              <>
                <div className="toggle-row">
                  <div>
                    <p style={{ fontSize:14, fontWeight:500 }}>💳 Parcelado</p>
                    <p style={{ fontSize:12, color:"#6b7280" }}>Divide em parcelas mensais</p>
                  </div>
                  <button className="toggle" onClick={()=>setForm(f=>({...f,parcelado:!f.parcelado}))}
                    style={{ background:form.parcelado?"#6366f1":"#2a2a38" }}>
                    <div className="toggle-knob" style={{ left:form.parcelado?21:3 }}/>
                  </button>
                </div>

                {form.parcelado && (
                  <div style={{ marginTop:8, marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
                    <input className="input" type="number" min="2" max="48" placeholder="Nº de parcelas" value={form.totalParcelas}
                      onChange={e=>setForm(f=>({...f,totalParcelas:parseInt(e.target.value)||2}))} style={{ flex:1 }}/>
                    {form.valor && parseInt(form.totalParcelas)>1 && (
                      <p style={{ fontSize:12, color:"#a5b4fc", whiteSpace:"nowrap" }}>
                        {fmt(parseFloat(form.valor)/form.totalParcelas)}/mês
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {formError && (
              <p style={{ fontSize:12, color:"#fca5a5", background:"rgba(248,113,113,.10)", border:"1px solid rgba(248,113,113,.22)", padding:"10px 12px", borderRadius:10, marginTop:12, lineHeight:1.45 }}>
                {formError}
              </p>
            )}
            <button className="btn" onClick={addTransaction}
              style={{ background:"#6366f1", color:"#fff", padding:14, fontSize:15, borderRadius:12, width:"100%", marginTop:16 }}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* ── Form Nova Meta ── */}
      {showMetaForm && (
        <div className="overlay" onClick={()=>setShowMetaForm(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, marginBottom:16 }}>Nova Meta</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input className="input" placeholder="Nome da meta" value={metaForm.nome} onChange={e=>setMetaForm(f=>({...f,nome:e.target.value}))}/>
              <input className="input" type="number" placeholder="Valor alvo (R$)" value={metaForm.alvo} onChange={e=>setMetaForm(f=>({...f,alvo:e.target.value}))}/>
              <input className="input" type="number" placeholder="Já economizado (R$)" value={metaForm.atual} onChange={e=>setMetaForm(f=>({...f,atual:e.target.value}))}/>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["#6366f1","#10b981","#f59e0b","#f87171","#60a5fa","#ec4899","#f97316"].map(cor=>(
                  <button key={cor} className="btn" onClick={()=>setMetaForm(f=>({...f,cor}))}
                    style={{ width:32, height:32, borderRadius:8, background:cor, border:metaForm.cor===cor?"3px solid #fff":"3px solid transparent" }}/>
                ))}
              </div>
              <button className="btn" onClick={addMeta} style={{ background:"#6366f1", color:"#fff", padding:14, fontSize:15, borderRadius:12, marginTop:4 }}>Criar Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  return (
    <AuthGate>
      {({ user, signOut }) => <FinanceApp user={user} onSignOut={signOut} />}
    </AuthGate>
  );
}
