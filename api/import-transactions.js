const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function send(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Método não permitido." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return send(res, 503, { error: "Importação com IA ainda não configurada no servidor." });
  }

  try {
    const { base64, mediaType, kind } = req.body || {};

    if (!base64 || !mediaType || !kind) {
      return send(res, 400, { error: "Arquivo inválido." });
    }

    if (!ALLOWED_TYPES.has(mediaType)) {
      return send(res, 400, { error: "Tipo de arquivo não suportado." });
    }

    if (base64.length > 8_000_000) {
      return send(res, 413, { error: "Arquivo muito grande. Envie um arquivo menor." });
    }

    const contentBlock = kind === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Analise este extrato/documento e extraia TODAS as transações. Retorne SOMENTE JSON:
{"transacoes":[{"tipo":"despesa","descricao":"desc","valor":100.00,"data":"YYYY-MM-DD","categoria":"Alimentação"}]}
Categorias: Salário,Freelance,Investimentos,Moradia,Alimentação,Transporte,Saúde,Lazer,Educação,Burgeria,Outros
Burgeria=fornecedores de alimentos atacado/açougue/congelados ou receitas do CNPJ próprio.
Data padrão se não encontrar: ${today}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1400,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic import error", data);
      return send(res, 502, { error: "Não foi possível analisar o arquivo agora." });
    }

    const text = data.content?.map((item) => item.text || "").join("") || "";
    const parsed = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, "").trim());

    if (!Array.isArray(parsed.transacoes)) {
      return send(res, 422, { error: "Nenhuma transação válida encontrada." });
    }

    const transactions = parsed.transacoes
      .filter((item) => item && item.data && item.valor !== undefined)
      .map((item) => ({
        tipo: item.tipo === "receita" ? "receita" : "despesa",
        descricao: String(item.descricao || "").slice(0, 180),
        valor: Math.abs(Number(item.valor) || 0),
        data: String(item.data).slice(0, 10),
        categoria: String(item.categoria || "Outros").slice(0, 80),
      }))
      .filter((item) => item.valor > 0);

    return send(res, 200, { transacoes: transactions });
  } catch (error) {
    console.error("Import API error", error);
    return send(res, 500, { error: "Erro ao processar o arquivo." });
  }
}
