import { useState, useMemo, useRef } from "react";

const CATEGORIES = {
  receita: ["Salário", "Freelance", "Investimentos", "Burgeria", "Outros"],
  despesa: ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Burgeria", "Outros"],
};

const COLORS = {
  Salário: "#4ade80", Freelance: "#34d399", Investimentos: "#6ee7b7",
  Moradia: "#f87171", Alimentação: "#fb923c", Transporte: "#fbbf24",
  Saúde: "#a78bfa", Lazer: "#60a5fa", Educação: "#38bdf8",
  Burgeria: "#f97316", Outros: "#94a3b8",
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const now = new Date();
const fmt = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initialTransactions = [
  // Nubank Abril 2026
  { id: 101, tipo: "receita", categoria: "Outros", descricao: "Pix recebido - Itaú (Paloma)", valor: 3500.00, data: "2026-04-01" },
  { id: 102, tipo: "receita", categoria: "Outros", descricao: "Pix recebido - Itaú (Paloma)", valor: 785.00, data: "2026-04-01" },
  { id: 103, tipo: "despesa", categoria: "Moradia", descricao: "Boleto GCI CAIXA - Habitação", valor: 1715.04, data: "2026-04-01" },
  { id: 104, tipo: "despesa", categoria: "Outros", descricao: "Resgate de empréstimo", valor: 1538.35, data: "2026-04-01" },
  { id: 105, tipo: "despesa", categoria: "Burgeria", descricao: "Pix DRY (Stone) - Fornecedor", valor: 30.00, data: "2026-04-02" },
  { id: 106, tipo: "receita", categoria: "Outros", descricao: "Pix recebido - Carlos Vinicius", valor: 50.00, data: "2026-04-03" },
  { id: 107, tipo: "despesa", categoria: "Burgeria", descricao: "Terra Brasili - Alimentos (atacado)", valor: 279.40, data: "2026-04-03" },
  { id: 108, tipo: "despesa", categoria: "Outros", descricao: "Pix Jonas Gomes", valor: 8.50, data: "2026-04-03" },
  { id: 109, tipo: "receita", categoria: "Outros", descricao: "Pix recebido - Carlos Vinicius", valor: 30.00, data: "2026-04-04" },
  { id: 110, tipo: "despesa", categoria: "Outros", descricao: "Pix Adailton Felipe", valor: 37.00, data: "2026-04-04" },
  { id: 111, tipo: "receita", categoria: "Burgeria", descricao: "Pix recebido - CNPJ Burgeria (Stone)", valor: 326.33, data: "2026-04-08" },
  { id: 112, tipo: "despesa", categoria: "Outros", descricao: "Boleto GUUG", valor: 354.92, data: "2026-04-08" },
  { id: 113, tipo: "despesa", categoria: "Outros", descricao: "Pix enviado - Paloma Itaú", valor: 0.24, data: "2026-04-08" },
  { id: 114, tipo: "receita", categoria: "Outros", descricao: "Pix recebido - Patricia Laurindo", valor: 20.00, data: "2026-04-09" },
  { id: 115, tipo: "receita", categoria: "Outros", descricao: "Pix recebido - Paula Laurindo", valor: 20.00, data: "2026-04-09" },
  { id: 116, tipo: "despesa", categoria: "Burgeria", descricao: "Rio Atacadão - Alimentos (atacado)", valor: 206.85, data: "2026-04-09" },
  { id: 117, tipo: "despesa", categoria: "Burgeria", descricao: "Boi Bom do Ceasa - Açougue", valor: 187.41, data: "2026-04-09" },
  { id: 118, tipo: "despesa", categoria: "Transporte", descricao: "EIA Transportes e Distribuição", valor: 115.00, data: "2026-04-09" },
  { id: 119, tipo: "despesa", categoria: "Burgeria", descricao: "Nechio Congelados", valor: 202.83, data: "2026-04-09" },
  { id: 120, tipo: "despesa", categoria: "Outros", descricao: "Pix Victor Fuzi Andrade", valor: 28.31, data: "2026-04-09" },
  // Itaú Abril 2026
  { id: 201, tipo: "receita", categoria: "Salário", descricao: "Pagamento de Salário - Itaú", valor: 4285.00, data: "2026-04-01" },
  { id: 202, tipo: "despesa", categoria: "Outros", descricao: "IOF - Itaú", valor: 0.42, data: "2026-04-02" },
  { id: 203, tipo: "receita", categoria: "Burgeria", descricao: "Pix recebido 30.375 - Burgeria", valor: 0.24, data: "2026-04-08" },
  // Itaú Março 2026
  { id: 301, tipo: "receita", categoria: "Burgeria", descricao: "Pix recebido 30.375 - Burgeria", valor: 13.35, data: "2026-03-13" },
  { id: 302, tipo: "despesa", categoria: "Outros", descricao: "Seguro LIS Itaú", valor: 13.35, data: "2026-03-11" },
  { id: 303, tipo: "despesa", categoria: "Outros", descricao: "Juros Limite da Conta - Itaú", valor: 228.89, data: "2026-03-10" },
  { id: 304, tipo: "despesa", categoria: "Outros", descricao: "Pix enviado Paloma 07/03", valor: 228.00, data: "2026-03-09" },
  { id: 305, tipo: "receita", categoria: "Outros", descricao: "Pix recebido Paloma 09/03", valor: 228.00, data: "2026-03-09" },
  { id: 306, tipo: "receita", categoria: "Salário", descricao: "Pagamento de Salário - Itaú", valor: 4666.15, data: "2026-03-06" },
  { id: 307, tipo: "despesa", categoria: "Outros", descricao: "Pix enviado Paloma 06/03", valor: 2056.39, data: "2026-03-06" },
  { id: 308, tipo: "despesa", categoria: "Outros", descricao: "Fatura paga Itaú Uniclass", valor: 1162.00, data: "2026-03-06" },
  { id: 309, tipo: "despesa", categoria: "Outros", descricao: "Pix enviado Paloma 06/03", valor: 1218.87, data: "2026-03-06" },
  { id: 310, tipo: "receita", categoria: "Outros", descricao: "Pix recebido Paloma 03/03", valor: 26.10, data: "2026-03-03" },
  { id: 311, tipo: "despesa", categoria: "Outros", descricao: "IOF - Itaú", valor: 26.10, data: "2026-03-03" },
  { id: 312, tipo: "receita", categoria: "Salário", descricao: "Pagamento de Salário - Itaú", valor: 4258.00, data: "2026-03-02" },
  { id: 313, tipo: "receita", categoria: "Burgeria", descricao: "Pix recebido 30.375 - Burgeria", valor: 200.00, data: "2026-03-02" },
  { id: 314, tipo: "receita", categoria: "Burgeria", descricao: "Pix recebido 30.375 - Burgeria", valor: 111.66, data: "2026-03-02" },
  // Itaú Fevereiro 2026
  { id: 401, tipo: "despesa", categoria: "Transporte", descricao: "Pagamento Boleto DETRAN RJ", valor: 293.71, data: "2026-02-20" },
  { id: 402, tipo: "despesa", categoria: "Outros", descricao: "Pgto Min - Itaucard", valor: 258.35, data: "2026-02-20" },
  { id: 403, tipo: "despesa", categoria: "Outros", descricao: "Seguro LIS Itaú", valor: 13.24, data: "2026-02-11" },
  { id: 404, tipo: "despesa", categoria: "Outros", descricao: "Juros Limite da Conta - Itaú", valor: 204.96, data: "2026-02-10" },
  { id: 405, tipo: "despesa", categoria: "Outros", descricao: "Pix enviado Carlos 07/02", valor: 100.00, data: "2026-02-09" },
  { id: 406, tipo: "receita", categoria: "Burgeria", descricao: "Pix recebido 30.375 - Burgeria", valor: 414.34, data: "2026-02-09" },
  { id: 407, tipo: "despesa", categoria: "Outros", descricao: "Pix enviado Carlos 09/02", valor: 150.00, data: "2026-02-09" },
];

const initialMetas = [
  { id: 1, nome: "Viagem", alvo: 8000, atual: 3200, cor: "#f59e0b" },
  { id: 2, nome: "Reserva de Emergência", alvo: 15000, atual: 9500, cor: "#6366f1" },
  { id: 3, nome: "Expansão Burgeria", alvo: 20000, atual: 0, cor: "#f97316" },
];

const initialOrcamento = {
  Moradia: 2000, Alimentação: 800, Transporte: 400, Saúde: 300,
  Lazer: 350, Educação: 200, Burgeria: 1500, Outros: 500,
};

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
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setPreview({ name: file.name, type: isPdf ? "pdf" : "image", base64, mediaType: file.type });
  };

  const analyze = async () => {
    if (!preview) return;
    setStep("loading");
    setError("");
    try {
      const contentBlock = preview.type === "pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: preview.base64 } }
        : { type: "image", source: { type: "base64", media_type: preview.mediaType, data: preview.base64 } };

      const prompt = `Você é um assistente financeiro. Analise este documento e extraia TODAS as transações financeiras.

Retorne SOMENTE JSON válido sem texto adicional:
{"transacoes":[{"tipo":"despesa","descricao":"descrição","valor":100.00,"data":"YYYY-MM-DD","categoria":"Alimentação"}]}

Categorias: Salário, Freelance, Investimentos, Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Burgeria, Outros
- "Burgeria" = gastos/receitas relacionados a lanchonete ou negócio de burgers (fornecedores de alimentos em atacado, açougue, congelados, distribuição de alimentos, receitas do CNPJ próprio)
- "despesa" = débitos, pagamentos, saídas
- "receita" = créditos, depósitos, salários, entradas
- Se data não estiver clara, use: ${new Date().toISOString().split("T")[0]}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (!parsed.transacoes || parsed.transacoes.length === 0) {
        setError("Nenhuma transação encontrada. Tente com outro arquivo.");
        setStep("upload"); return;
      }

      const withIds = parsed.transacoes.map((t, i) => ({ ...t, id: Date.now() + i, valor: Math.abs(parseFloat(t.valor) || 0) }));
      setExtracted(withIds);
      const sel = {};
      withIds.forEach(t => { sel[t.id] = true; });
      setSelected(sel);
      setStep("review");
    } catch (e) {
      setError("Erro ao analisar o arquivo. Tente novamente.");
      setStep("upload");
    }
  };

  const confirm = () => { onConfirm(extracted.filter(t => selected[t.id])); onClose(); };
  const toggleAll = (val) => { const s = {}; extracted.forEach(t => { s[t.id] = val; }); setSelected(s); };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "85vh", overflowY: "auto" }}>
        {step === "upload" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800 }}>📎 Importar com IA</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 22, cursor: "pointer" }}>✕</button>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
            Envie um <strong style={{ color: "#a5b4fc" }}>extrato bancário (PDF)</strong> ou <strong style={{ color: "#a5b4fc" }}>foto</strong> de boleto/comprovante. A IA já reconhece gastos da <strong style={{ color: "#f97316" }}>Burgeria</strong> automaticamente.
          </p>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            style={{ border: `2px dashed ${dragOver || preview ? "#6366f1" : "#2a2a38"}`, borderRadius: 16, padding: 32, textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(99,102,241,0.08)" : preview ? "rgba(99,102,241,0.05)" : "#111118", transition: "all 0.2s", marginBottom: 12 }}>
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            {preview ? (<>
              <p style={{ fontSize: 36, marginBottom: 8 }}>{preview.type === "pdf" ? "📄" : "🖼️"}</p>
              <p style={{ fontWeight: 600, color: "#a5b4fc", fontSize: 14 }}>{preview.name}</p>
              <p style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>Toque para trocar</p>
            </>) : (<>
              <p style={{ fontSize: 40, marginBottom: 8 }}>📂</p>
              <p style={{ fontWeight: 600, color: "#f1f5f9" }}>Toque para selecionar</p>
              <p style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>PDF ou imagem (JPG, PNG)</p>
            </>)}
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}
          <button className="btn" onClick={analyze} disabled={!preview}
            style={{ background: preview ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#1e1e2e", color: preview ? "#fff" : "#4b5563", padding: 14, fontSize: 15, borderRadius: 12, width: "100%" }}>
            ✨ Analisar com IA
          </button>
        </>)}

        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16, display: "inline-block", animation: "pulse 1s ease-in-out infinite" }}>🤖</div>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Analisando documento...</p>
            <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>A IA está lendo e categorizando<br />suas transações automaticamente</p>
            <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
          </div>
        )}

        {step === "review" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800 }}>✅ Revisar</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 22, cursor: "pointer" }}>✕</button>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>{extracted.length} transação(ões) encontrada(s).</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn" onClick={() => toggleAll(true)} style={{ flex: 1, background: "#1a1a24", color: "#a5b4fc", padding: "7px 0", fontSize: 12 }}>Todas</button>
            <button className="btn" onClick={() => toggleAll(false)} style={{ flex: 1, background: "#1a1a24", color: "#6b7280", padding: "7px 0", fontSize: 12 }}>Nenhuma</button>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
            {extracted.map(t => (
              <div key={t.id} onClick={() => setSelected(s => ({ ...s, [t.id]: !s[t.id] }))}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, marginBottom: 6, cursor: "pointer", background: selected[t.id] ? "rgba(99,102,241,0.1)" : "#111118", border: `1px solid ${selected[t.id] ? "#6366f1" : "#1e1e2e"}`, transition: "all 0.15s" }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selected[t.id] ? "#6366f1" : "#374151"}`, background: selected[t.id] ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "#fff", fontWeight: 700 }}>
                  {selected[t.id] ? "✓" : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.descricao}</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{t.categoria} · {t.data}</p>
                </div>
                <p style={{ fontWeight: 700, color: t.tipo === "receita" ? "#4ade80" : "#f87171", fontSize: 13, flexShrink: 0 }}>
                  {t.tipo === "receita" ? "+" : "-"}{fmt(t.valor)}
                </p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => { setStep("upload"); setPreview(null); }} style={{ flex: 1, background: "#1a1a24", color: "#6b7280", padding: 12, fontSize: 13 }}>← Voltar</button>
            <button className="btn" onClick={confirm} style={{ flex: 2, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", padding: 12, fontSize: 14 }}>
              Importar {Object.values(selected).filter(Boolean).length}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}

function gerarRecorrencias(transactions, mes, ano) {
  const novas = [];

  transactions.forEach(t => {
    if (!t.recorrente) return;

    const dataOriginal = new Date(t.data);
    const fim = t.fimRecorrencia ? new Date(t.fimRecorrencia) : null;
    const dataAtual = new Date(ano, mes, dataOriginal.getDate());

    // ⛔ se passou do fim
    if (fim && dataAtual > fim) return;

    // só gera se for mês válido
    if (dataAtual >= dataOriginal) {
      novas.push({
        ...t,
        id: `${t.id}-${mes}-${ano}`,
        data: dataAtual.toISOString().split("T")[0]
      });
    }
  });

  return novas;
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [metas, setMetas] = useState(initialMetas);
  const [orcamento, setOrcamento] = useState(initialOrcamento);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [form, setForm] = useState({
    tipo: "despesa",
    categoria: "",
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],

    recorrente: false,
    tipoRecorrencia: "mensal",
    fimRecorrencia: "",

    parcelado: false,
    totalParcelas: 1
  });
  const [metaForm, setMetaForm] = useState({ nome: "", alvo: "", atual: "", cor: "#6366f1" });
  const [filtroMes, setFiltroMes] = useState(3); // Abril
  const [filtroAno, setFiltroAno] = useState(2026);
  const [aporteMeta, setAporteMeta] = useState({});
  const [importSuccess, setImportSuccess] = useState(0);

  const transacoesMes = useMemo(() => {
    const base = transactions.filter(t => {
      const d = new Date(t.data);
      return d.getMonth() === filtroMes && d.getFullYear() === filtroAno;
    });

    const recorrentes = gerarRecorrencias(transactions, filtroMes, filtroAno);

    return [...base, ...recorrentes];
  }, [transactions, filtroMes, filtroAno]);
  const totalReceitas = useMemo(() => transacoesMes.filter(t => t.tipo === "receita").reduce((s, t) => s + t.valor, 0), [transacoesMes]);
  const totalDespesas = useMemo(() => transacoesMes.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0), [transacoesMes]);
  const saldo = totalReceitas - totalDespesas;

  const despesasFuturas = 0; // pode evoluir depois
  const faturaCartao = 0; // depois você implementa

  const saldoReal = totalReceitas - totalDespesas - despesasFuturas - faturaCartao;

  const hoje = new Date();
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const diasRestantes = ultimoDia.getDate() - hoje.getDate();

  const limiteDiario = diasRestantes > 0 ? saldoReal / diasRestantes : saldoReal;

  const gastosPorCategoria = useMemo(() => {
    const map = {};
    transacoesMes.filter(t => t.tipo === "despesa").forEach(t => { map[t.categoria] = (map[t.categoria] || 0) + t.valor; });
    return map;
  }, [transacoesMes]);

  const addTransaction = () => {
    if (!form.categoria || !form.valor || !form.data) return;

    const valor = parseFloat(form.valor);

    // 💳 PARCELADO
    if (form.parcelado && form.totalParcelas > 1) {
      const parcelas = [];

      for (let i = 0; i < form.totalParcelas; i++) {
        const data = new Date(form.data);
        data.setMonth(data.getMonth() + i);

        parcelas.push({
          ...form,
          id: Date.now() + i,
          valor: valor / form.totalParcelas,
          descricao: `${form.descricao} (${i + 1}/${form.totalParcelas})`,
          data: data.toISOString().split("T")[0],
          parcelado: true
        });
      }

      setTransactions(prev => [...prev, ...parcelas]);
    } else {
      setTransactions(prev => [
        ...prev,
        {
          ...form,
          id: Date.now(),
          valor
        }
      ]);
    }

    setShowForm(false);
  };
  const handleImportConfirm = (newTs) => {
    setTransactions(prev => [...prev, ...newTs]);
    setImportSuccess(newTs.length);
    setTimeout(() => setImportSuccess(0), 3500);
    if (newTs.length > 0) {
      const d = new Date(newTs[0].data);
      setFiltroMes(d.getMonth());
      setFiltroAno(d.getFullYear());
      setTab("transacoes");
    }
  };

  const removeTransaction = (id) => setTransactions(prev => prev.filter(t => t.id !== id));
  const addMeta = () => {
    if (!metaForm.nome || !metaForm.alvo) return;
    setMetas(prev => [...prev, { ...metaForm, id: Date.now(), alvo: parseFloat(metaForm.alvo), atual: parseFloat(metaForm.atual || 0) }]);
    setMetaForm({ nome: "", alvo: "", atual: "", cor: "#6366f1" });
    setShowMetaForm(false);
  };
  const aportarMeta = (id) => {
    const val = parseFloat(aporteMeta[id] || 0);
    if (!val) return;
    setMetas(prev => prev.map(m => m.id === id ? { ...m, atual: Math.min(m.atual + val, m.alvo) } : m));
    setAporteMeta(prev => ({ ...prev, [id]: "" }));
  };
  const removeMeta = (id) => setMetas(prev => prev.filter(m => m.id !== id));
  const totalOrcamento = Object.values(orcamento).reduce((s, v) => s + v, 0);
  const mensagem = saldoReal > 0
    ? `Você ainda tem ${fmt(saldoReal)} até o fim do mês`
    : `Você já estourou ${fmt(Math.abs(saldoReal))}`;

  const porcentagemGasto = totalReceitas > 0
    ? totalDespesas / totalReceitas
    : 0;
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0f0f14", minHeight: "100vh", color: "#f1f5f9", maxWidth: 430, margin: "0 auto", position: "relative", paddingBottom: 80 }}>
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
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:50;display:flex;align-items:flex-end;max-width:430px;margin:0 auto;left:50%;transform:translateX(-50%)}
        .sheet{background:#16161f;border-radius:20px 20px 0 0;padding:24px;width:100%}
        .toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;padding:12px 20px;border-radius:12px;font-weight:600;font-size:14px;z-index:100;animation:fadeIn 0.3s ease;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.4)}
      `}</style>

      {importSuccess > 0 && <div className="toast">✅ {importSuccess} transação(ões) importada(s)!</div>}

      {/* Header */}
      <div style={{ padding: "24px 20px 12px", background: "linear-gradient(180deg, #13131d 0%, transparent 100%)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Minhas Finanças</p>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              {tab === "dashboard" ? "Resumo" : tab === "transacoes" ? "Transações" : tab === "orcamento" ? "Orçamento" : "Metas"}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {tab === "transacoes" && (<>
              <button className="btn" onClick={() => setShowImport(true)}
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", width: 38, height: 38, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>📎</button>
              <button className="btn" onClick={() => setShowForm(true)}
                style={{ background: "#6366f1", color: "#fff", width: 38, height: 38, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </>)}
            {tab === "metas" && (
              <button className="btn" onClick={() => setShowMetaForm(true)}
                style={{ background: "#6366f1", color: "#fff", width: 38, height: 38, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            )}
          </div>
        </div>
        {(tab === "dashboard" || tab === "transacoes") && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
            {MONTHS.map((m, i) => (
              <button key={i} className="btn" onClick={() => setFiltroMes(i)}
                style={{ background: filtroMes === i ? "#6366f1" : "#1a1a24", color: filtroMes === i ? "#fff" : "#6b7280", padding: "5px 12px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px" }} className="fade-in">
        {/* DASHBOARD */}
        {tab === "dashboard" && (<>
          <div style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 12
          }}>
            <p style={{ fontSize: 12, color: "#6b7280" }}>Saldo real disponível</p>
            <h3 style={{ fontSize: 20, fontWeight: 700 }}>
              {fmt(saldoReal)}
            </h3>

            <p style={{ fontSize: 12, marginTop: 8, color: "#a5b4fc" }}>
              {mensagem}
            </p>

            <p style={{ fontSize: 12, marginTop: 4 }}>
              Você pode gastar até <strong>{fmt(limiteDiario)}</strong> por dia
            </p>
          </div>
          <button className="btn" onClick={() => { setTab("transacoes"); setShowImport(true); }}
            style={{ width: "100%", background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(251,146,60,0.08))", border: "1px solid rgba(249,115,22,0.25)", color: "#fb923c", padding: "12px 16px", borderRadius: 14, display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontSize: 13 }}>
            <span style={{ fontSize: 22 }}>📎</span>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontWeight: 700 }}>Importar extrato ou boleto</p>
              <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>PDF ou foto — IA reconhece Burgeria automaticamente</p>
            </div>
            <span style={{ marginLeft: "auto" }}>→</span>
          </button>

          {/* Burgeria highlight */}
          {porcentagemGasto > 0.8 && (
            <div style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 12,
              padding: 10,
              marginBottom: 12,
              color: "#f87171",
              fontSize: 12
            }}>
              ⚠️ Você já gastou mais de 80% da sua renda
            </div>
          )}
          {(() => {
            const burgeriaReceitas = transacoesMes.filter(t => t.tipo === "receita" && t.categoria === "Burgeria").reduce((s, t) => s + t.valor, 0);
            const burgeriaDespesas = transacoesMes.filter(t => t.tipo === "despesa" && t.categoria === "Burgeria").reduce((s, t) => s + t.valor, 0);
            const lucro = burgeriaReceitas - burgeriaDespesas;
            if (burgeriaReceitas === 0 && burgeriaDespesas === 0) return null;
            return (
              <div style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.1))", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>🍔</span>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#fb923c" }}>Burgeria — este mês</p>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div><p style={{ fontSize: 11, color: "#6b7280" }}>Entradas</p><p style={{ fontWeight: 700, color: "#4ade80", fontSize: 14 }}>+{fmt(burgeriaReceitas)}</p></div>
                  <div><p style={{ fontSize: 11, color: "#6b7280" }}>Custos</p><p style={{ fontWeight: 700, color: "#f87171", fontSize: 14 }}>-{fmt(burgeriaDespesas)}</p></div>
                  <div><p style={{ fontSize: 11, color: "#6b7280" }}>Resultado</p><p style={{ fontWeight: 700, color: lucro >= 0 ? "#4ade80" : "#f87171", fontSize: 14 }}>{fmt(lucro)}</p></div>
                </div>
              </div>
            );
          })()}

          <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 20, padding: 20, marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Saldo do mês</p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, margin: "4px 0" }}>{fmt(saldo)}</h2>
            <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
              <div><p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Receitas</p><p style={{ fontWeight: 700, color: "#4ade80", fontSize: 15 }}>+{fmt(totalReceitas)}</p></div>
              <div><p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Despesas</p><p style={{ fontWeight: 700, color: "#f87171", fontSize: 15 }}>-{fmt(totalDespesas)}</p></div>
            </div>
          </div>

          <div className="card">
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Gastos por Categoria</p>
            {Object.keys(gastosPorCategoria).length === 0 ? (
              <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Nenhuma despesa neste mês</p>
            ) : Object.entries(gastosPorCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
              const pct = totalDespesas > 0 ? (val / totalDespesas) * 100 : 0;
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{cat === "Burgeria" ? "🍔 " : ""}{cat}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(val)}</span>
                  </div>
                  <div className="bar-bg"><div style={{ width: `${pct}%`, background: COLORS[cat] || "#94a3b8", height: "100%", borderRadius: 8 }} /></div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Metas</p>
            {metas.slice(0, 3).map(m => {
              const pct = Math.min((m.atual / m.alvo) * 100, 100);
              return (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{m.nome}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="bar-bg"><div style={{ width: `${pct}%`, background: m.cor, height: "100%", borderRadius: 8 }} /></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>{fmt(m.atual)}</span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>{fmt(m.alvo)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Últimas Transações</p>
            {transacoesMes.slice(-5).reverse().map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e1e2e" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: t.categoria === "Burgeria" ? "rgba(249,115,22,0.15)" : t.tipo === "receita" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                    {t.categoria === "Burgeria" ? "🍔" : t.tipo === "receita" ? "💰" : "💸"}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{t.descricao || t.categoria}</p>
                    <p style={{ fontSize: 11, color: "#4b5563" }}>{t.categoria}</p>
                  </div>
                </div>
                <p style={{ fontWeight: 600, color: t.tipo === "receita" ? "#4ade80" : "#f87171", fontSize: 14 }}>
                  {t.tipo === "receita" ? "+" : "-"}{fmt(t.valor)}
                </p>
              </div>
            ))}
          </div>
        </>)}

        {/* TRANSAÇÕES */}
        {tab === "transacoes" && (<>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "#4b5563" }}>Receitas</p>
              <p style={{ fontWeight: 700, color: "#4ade80", fontSize: 15 }}>{fmt(totalReceitas)}</p>
            </div>
            <div style={{ flex: 1, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "#4b5563" }}>Despesas</p>
              <p style={{ fontWeight: 700, color: "#f87171", fontSize: 15 }}>{fmt(totalDespesas)}</p>
            </div>
          </div>
          <button className="btn" onClick={() => setShowImport(true)}
            style={{ width: "100%", background: "rgba(99,102,241,0.08)", border: "1px dashed rgba(99,102,241,0.4)", color: "#a5b4fc", padding: "11px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13 }}>
            <span>📎</span> Importar extrato ou boleto com IA
          </button>
          {transacoesMes.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
              <p style={{ color: "#4b5563" }}>Nenhuma transação neste mês</p>
            </div>
          ) : [...transacoesMes].reverse().map(t => (
            <div key={t.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: t.categoria === "Burgeria" ? "rgba(249,115,22,0.15)" : t.tipo === "receita" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {t.categoria === "Burgeria" ? "🍔" : t.tipo === "receita" ? "💰" : "💸"}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{t.descricao || t.categoria}</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{t.categoria} · {t.data}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <p style={{ fontWeight: 700, color: t.tipo === "receita" ? "#4ade80" : "#f87171" }}>
                  {t.tipo === "receita" ? "+" : "-"}{fmt(t.valor)}
                </p>
                <button onClick={() => removeTransaction(t.id)} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 16 }}>🗑</button>
              </div>
            </div>
          ))}
        </>)}

        {/* ORÇAMENTO */}
        {tab === "orcamento" && (<>
          <div style={{ background: "linear-gradient(135deg, #1e1e2e, #16213e)", borderRadius: 20, padding: 20, marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "#6b7280" }}>Orçamento Total</p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800 }}>{fmt(totalOrcamento)}</h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Gasto: {fmt(totalDespesas)} · Restante: <span style={{ color: (totalOrcamento - totalDespesas) >= 0 ? "#4ade80" : "#f87171" }}>{fmt(totalOrcamento - totalDespesas)}</span></p>
          </div>
          {Object.entries(orcamento).map(([cat, limite]) => {
            const gasto = gastosPorCategoria[cat] || 0;
            const pct = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;
            const over = gasto > limite;
            const cor = over ? "#f87171" : pct > 75 ? "#fbbf24" : cat === "Burgeria" ? "#f97316" : "#4ade80";
            return (
              <div key={cat} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{cat === "Burgeria" ? "🍔 " : ""}{cat}</span>
                  {over && <span className="pill" style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>Estourado!</span>}
                </div>
                <div className="bar-bg" style={{ marginBottom: 8 }}><div style={{ width: `${pct}%`, background: cor, height: "100%", borderRadius: 8, transition: "width 0.5s" }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{fmt(gasto)} / {fmt(limite)}</span>
                  <input className="input" type="number" value={orcamento[cat]}
                    onChange={e => setOrcamento(prev => ({ ...prev, [cat]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: 90, padding: "4px 8px", fontSize: 13, textAlign: "right" }} />
                </div>
              </div>
            );
          })}
        </>)}

        {/* METAS */}
        {tab === "metas" && (<>
          {metas.map(m => {
            const pct = Math.min((m.atual / m.alvo) * 100, 100);
            const concluida = pct >= 100;
            return (
              <div key={m.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>{m.nome}</p>
                    <p style={{ fontSize: 12, color: "#6b7280" }}>{fmt(m.atual)} de {fmt(m.alvo)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {concluida && <span className="pill" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>✓ Concluída</span>}
                    <button onClick={() => removeMeta(m.id)} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 16 }}>🗑</button>
                  </div>
                </div>
                <div style={{ background: "#111118", borderRadius: 10, height: 12, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ width: `${pct}%`, background: m.cor, height: "100%", borderRadius: 10, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: "#6b7280" }}>Progresso: <strong style={{ color: "#f1f5f9" }}>{pct.toFixed(1)}%</strong></span>
                  <span style={{ color: "#6b7280" }}>Faltam: <strong style={{ color: m.cor }}>{fmt(Math.max(m.alvo - m.atual, 0))}</strong></span>
                </div>
                {!concluida && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input" type="number" placeholder="Valor do aporte" value={aporteMeta[m.id] || ""} onChange={e => setAporteMeta(prev => ({ ...prev, [m.id]: e.target.value }))} style={{ flex: 1 }} />
                    <button className="btn" onClick={() => aportarMeta(m.id)} style={{ background: m.cor, color: "#fff", padding: "10px 14px", fontSize: 13 }}>Aportar</button>
                  </div>
                )}
              </div>
            );
          })}
          {metas.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎯</p>
              <p style={{ color: "#4b5563" }}>Nenhuma meta criada ainda</p>
            </div>
          )}
        </>)}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#13131d", borderTop: "1px solid #1e1e2e", display: "flex", padding: "8px 0 16px" }}>
        {[
          { id: "dashboard", icon: "📊", label: "Resumo" },
          { id: "transacoes", icon: "💸", label: "Transações" },
          { id: "orcamento", icon: "📋", label: "Orçamento" },
          { id: "metas", icon: "🎯", label: "Metas" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="btn"
            style={{ flex: 1, background: "none", color: tab === t.id ? "#a5b4fc" : "#4b5563", fontSize: 10, fontWeight: 600, padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {showImport && <ImportSheet onClose={() => setShowImport(false)} onConfirm={handleImportConfirm} />}

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Nova Transação</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["despesa", "receita"].map(tipo => (
                <button key={tipo} className="btn" onClick={() => setForm(f => ({ ...f, tipo, categoria: "" }))}
                  style={{ flex: 1, padding: 10, background: form.tipo === tipo ? (tipo === "receita" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)") : "#1a1a24", color: form.tipo === tipo ? (tipo === "receita" ? "#4ade80" : "#f87171") : "#6b7280", border: form.tipo === tipo ? `1px solid ${tipo === "receita" ? "#4ade80" : "#f87171"}` : "1px solid transparent", fontSize: 13 }}>
                  {tipo === "receita" ? "💰 Receita" : "💸 Despesa"}
                </button>
              ))}
            </div>
            <label style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))}
              />
              Transação recorrente
            </label>

            {form.recorrente && (
              <select
                className="select"
                value={form.tipoRecorrencia}
                onChange={e => setForm(f => ({ ...f, tipoRecorrencia: e.target.value }))}
              >
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
              </select>
            )}
            <label style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={form.parcelado}
                onChange={e => setForm(f => ({ ...f, parcelado: e.target.checked }))}
              />
              Compra parcelada
            </label>

            {form.parcelado && (
              <input
                className="input"
                type="number"
                placeholder="Número de parcelas"
                value={form.totalParcelas}
                onChange={e => setForm(f => ({ ...f, totalParcelas: e.target.value }))}
              />
            )}
            {form.recorrente && (
              <input
                className="input"
                type="date"
                value={form.fimRecorrencia}
                onChange={e => setForm(f => ({ ...f, fimRecorrencia: e.target.value }))}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select className="select" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                <option value="">Categoria</option>
                {CATEGORIES[form.tipo].map(c => <option key={c} value={c}>{c === "Burgeria" ? "🍔 Burgeria" : c}</option>)}
              </select>
              <input className="input" placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              <input className="input" type="number" placeholder="Valor (R$)" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              <input className="input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              <button className="btn" onClick={addTransaction} style={{ background: "#6366f1", color: "#fff", padding: 14, fontSize: 15, borderRadius: 12, marginTop: 4 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {showMetaForm && (
        <div className="overlay" onClick={() => setShowMetaForm(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Nova Meta</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="input" placeholder="Nome da meta" value={metaForm.nome} onChange={e => setMetaForm(f => ({ ...f, nome: e.target.value }))} />
              <input className="input" type="number" placeholder="Valor alvo (R$)" value={metaForm.alvo} onChange={e => setMetaForm(f => ({ ...f, alvo: e.target.value }))} />
              <input className="input" type="number" placeholder="Já economizado (R$)" value={metaForm.atual} onChange={e => setMetaForm(f => ({ ...f, atual: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["#6366f1", "#10b981", "#f59e0b", "#f87171", "#60a5fa", "#ec4899", "#f97316"].map(cor => (
                  <button key={cor} className="btn" onClick={() => setMetaForm(f => ({ ...f, cor }))}
                    style={{ width: 32, height: 32, borderRadius: 8, background: cor, border: metaForm.cor === cor ? "3px solid #fff" : "3px solid transparent" }} />
                ))}
              </div>
              <button className="btn" onClick={addMeta} style={{ background: "#6366f1", color: "#fff", padding: 14, fontSize: 15, borderRadius: 12, marginTop: 4 }}>Criar Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
