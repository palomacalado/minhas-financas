import { neonClient } from "../lib/neonClient";

const toApp = (row) => ({
  id: row.id,
  tipo: row.type,
  categoria: row.category || "",
  descricao: row.description || "",
  valor: Number(row.amount) || 0,
  data: row.transaction_date,
  recorrente: Boolean(row.recurring),
  tipoRecorrencia: row.recurrence_type || "mensal",
  fimRecorrencia: row.recurrence_end || "",
  parcelado: Boolean(row.installment_total && row.installment_total > 1),
  totalParcelas: row.installment_total || 1,
  numeroParcela: row.installment_number || null,
  confidence: row.confidence || "confirmed",
});

const toDb = (transaction) => ({
  type: transaction.tipo,
  category: transaction.categoria || null,
  description: transaction.descricao || null,
  amount: Number(transaction.valor) || 0,
  transaction_date: transaction.data,
  recurring: Boolean(transaction.recorrente),
  recurrence_type: transaction.recorrente ? (transaction.tipoRecorrencia || "mensal") : null,
  recurrence_end: transaction.fimRecorrencia || null,
  installment_number: transaction.numeroParcela || null,
  installment_total: transaction.totalParcelas > 1 ? transaction.totalParcelas : null,
  confidence: transaction.confidence || "confirmed",
});

export async function listTransactions() {
  const { data, error } = await neonClient
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: true });

  if (error) throw error;
  return (data || []).map(toApp);
}

export async function createTransactions(transactions) {
  const rows = transactions.map(toDb);
  const { data, error } = await neonClient
    .from("transactions")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return (data || []).map(toApp);
}

export async function deleteTransaction(id) {
  const { error } = await neonClient
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
