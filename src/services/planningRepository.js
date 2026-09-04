import { neonClient } from "../lib/neonClient";

export async function listAccounts() {
  const { data, error } = await neonClient.from("accounts").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    balance: Number(row.opening_balance) || 0,
    includeInAvailable: Boolean(row.include_in_available_balance),
  }));
}

export async function createAccount(account) {
  const { data, error } = await neonClient.from("accounts").insert({
    name: account.name,
    kind: account.kind,
    opening_balance: Number(account.balance) || 0,
    include_in_available_balance: Boolean(account.includeInAvailable),
  }).select("*").single();
  if (error) throw error;
  return { id:data.id, name:data.name, kind:data.kind, balance:Number(data.opening_balance)||0, includeInAvailable:Boolean(data.include_in_available_balance) };
}

export async function deleteAccount(id) {
  const { error } = await neonClient.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function listSavingsGoals() {
  const { data, error } = await neonClient.from("savings_goals").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({ id:row.id, name:row.name, target:Number(row.target_amount)||0, current:Number(row.current_amount)||0 }));
}

export async function createSavingsGoal(goal) {
  const { data, error } = await neonClient.from("savings_goals").insert({
    name: goal.name,
    target_amount: Number(goal.target) || 0,
    current_amount: Number(goal.current) || 0,
  }).select("*").single();
  if (error) throw error;
  return { id:data.id, name:data.name, target:Number(data.target_amount)||0, current:Number(data.current_amount)||0 };
}

export async function updateSavingsGoal(id, patch) {
  const payload = {};
  if (patch.current !== undefined) payload.current_amount = Number(patch.current) || 0;
  if (patch.target !== undefined) payload.target_amount = Number(patch.target) || 0;
  if (patch.name !== undefined) payload.name = patch.name;
  const { data, error } = await neonClient.from("savings_goals").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return { id:data.id, name:data.name, target:Number(data.target_amount)||0, current:Number(data.current_amount)||0 };
}

export async function deleteSavingsGoal(id) {
  const { error } = await neonClient.from("savings_goals").delete().eq("id", id);
  if (error) throw error;
}

export async function listCards() {
  const { data, error } = await neonClient.from("cards").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({ id:row.id, name:row.name, closingDay:row.closing_day, dueDay:row.due_day, limit:Number(row.credit_limit)||0 }));
}

export async function createCard(card) {
  const { data, error } = await neonClient.from("cards").insert({
    name: card.name,
    closing_day: Number(card.closingDay),
    due_day: Number(card.dueDay),
    credit_limit: card.limit ? Number(card.limit) : null,
  }).select("*").single();
  if (error) throw error;
  return { id:data.id, name:data.name, closingDay:data.closing_day, dueDay:data.due_day, limit:Number(data.credit_limit)||0 };
}

export async function deleteCard(id) {
  const { error } = await neonClient.from("cards").delete().eq("id", id);
  if (error) throw error;
}

export async function listCardPurchases() {
  const { data, error } = await neonClient.from("card_purchases").select("*").order("purchase_date", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id:row.id, cardId:row.card_id, description:row.description||"", totalAmount:Number(row.total_amount)||0,
    purchaseDate:row.purchase_date, installments:row.installments||1, category:row.category||"Outros",
  }));
}

export async function createCardPurchase(purchase) {
  const { data, error } = await neonClient.from("card_purchases").insert({
    card_id: purchase.cardId,
    description: purchase.description || null,
    total_amount: Number(purchase.totalAmount) || 0,
    purchase_date: purchase.purchaseDate,
    installments: Number(purchase.installments) || 1,
    category: purchase.category || null,
  }).select("*").single();
  if (error) throw error;
  return {
    id:data.id, cardId:data.card_id, description:data.description||"", totalAmount:Number(data.total_amount)||0,
    purchaseDate:data.purchase_date, installments:data.installments||1, category:data.category||"Outros",
  };
}

export async function deleteCardPurchase(id) {
  const { error } = await neonClient.from("card_purchases").delete().eq("id", id);
  if (error) throw error;
}

const localDate = (value) => new Date(value + "T12:00:00");
const toIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
};

export function buildCardProjectionTransactions(cards, purchases) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const result = [];

  purchases.forEach((purchase) => {
    const card = byId.get(purchase.cardId);
    if (!card) return;

    const purchaseDate = localDate(purchase.purchaseDate);
    const installments = Math.max(1, Number(purchase.installments) || 1);
    const installmentValue = Number((purchase.totalAmount / installments).toFixed(2));
    const firstMonthOffset = purchaseDate.getDate() > card.closingDay ? 2 : 1;

    for (let i = 0; i < installments; i += 1) {
      const due = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + firstMonthOffset + i, 1);
      const lastDay = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
      due.setDate(Math.min(card.dueDay, lastDay));

      result.push({
        id: "card-" + purchase.id + "-" + (i + 1),
        tipo: "cartao",
        categoria: purchase.category || "Cartão",
        descricao: (purchase.description || card.name) + " (" + (i + 1) + "/" + installments + ")",
        valor: i === installments - 1 ? Number((purchase.totalAmount - installmentValue * (installments - 1)).toFixed(2)) : installmentValue,
        data: toIso(due),
        recorrente: false,
        parcelado: installments > 1,
        totalParcelas: installments,
        numeroParcela: i + 1,
        projection: true,
      });
    }
  });

  return result;
}
