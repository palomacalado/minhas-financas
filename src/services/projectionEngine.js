import { parseLocalDate, toLocalIso } from "../utils/dateUtils";

const iso = (date) => toLocalIso(date);

const monthKey = (date) => iso(date).slice(0, 7);

const addMonths = (date, amount) => {
  const d = parseLocalDate(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + amount);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
};

const isWithin = (date, start, end) => date >= start && date <= end;

function expandTransaction(transaction, startDate, endDate) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const original = parseLocalDate(transaction.data);
  const recurrenceEnd = transaction.fimRecorrencia
    ? parseLocalDate(transaction.fimRecorrencia)
    : end;

  if (!transaction.recorrente) {
    if (transaction.tipo === "diario") {
      const txMonth = monthKey(original);
      const startMonth = monthKey(start);
      const endMonth = monthKey(end);
      return txMonth >= startMonth && txMonth <= endMonth ? [transaction] : [];
    }
    return isWithin(original, start, end) ? [transaction] : [];
  }

  const expanded = [];
  const recurrenceType = transaction.tipoRecorrencia || "mensal";
  let cursor = parseLocalDate(original);

  while (cursor <= end && cursor <= recurrenceEnd) {
    if (cursor >= start) {
      expanded.push({
        ...transaction,
        id: `${transaction.id}-projection-${iso(cursor)}`,
        data: iso(cursor),
        projection: true,
      });
    }
    if (recurrenceType === "semanal") {
      cursor = parseLocalDate(cursor);
      cursor.setDate(cursor.getDate() + 7);
    } else {
      cursor = addMonths(cursor, 1);
    }
  }

  return expanded;
}

export function buildProjection({
  transactions = [],
  initialBalance = 0,
  startDate,
  endDate,
}) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const expanded = transactions.flatMap((t) => expandTransaction(t, start, end));

  const regularByDate = new Map();
  const dailyBudgetsByMonth = new Map();

  expanded.forEach((t) => {
    const value = Number(t.valor) || 0;
    if (t.tipo === "diario") {
      const key = monthKey(t.data);
      dailyBudgetsByMonth.set(key, (dailyBudgetsByMonth.get(key) || 0) + value);
      return;
    }
    const key = iso(t.data);
    const list = regularByDate.get(key) || [];
    list.push(t);
    regularByDate.set(key, list);
  });

  const days = [];
  let balance = Number(initialBalance) || 0;
  let cursor = parseLocalDate(start);

  while (cursor <= end) {
    const key = iso(cursor);
    const month = monthKey(cursor);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const monthlyDailyBudget = dailyBudgetsByMonth.get(month) || 0;
    const dailyBudget = monthlyDailyBudget / daysInMonth;
    const movements = regularByDate.get(key) || [];

    const income = movements
      .filter((t) => t.tipo === "receita")
      .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    const expense = movements
      .filter((t) => t.tipo === "despesa" || t.tipo === "cartao" || t.tipo === "economia")
      .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);

    balance = balance + income - expense - dailyBudget;

    days.push({
      date: key,
      month,
      income,
      expense,
      dailyBudget,
      monthlyDailyBudget,
      balance,
      movements,
    });

    cursor = parseLocalDate(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  const monthMap = new Map();
  days.forEach((day) => {
    const current = monthMap.get(day.month) || {
      month: day.month,
      income: 0,
      expense: 0,
      dailyBudgetTotal: day.monthlyDailyBudget,
      lowestBalance: day.balance,
      lowestBalanceDate: day.date,
      closingBalance: day.balance,
    };

    current.income += day.income;
    current.expense += day.expense;
    current.closingBalance = day.balance;
    if (day.balance < current.lowestBalance) {
      current.lowestBalance = day.balance;
      current.lowestBalanceDate = day.date;
    }
    monthMap.set(day.month, current);
  });

  const months = [...monthMap.values()];
  const lowest = days.reduce(
    (acc, day) => (!acc || day.balance < acc.balance ? day : acc),
    null
  );

  return {
    days,
    months,
    lowestBalance: lowest?.balance ?? initialBalance,
    lowestBalanceDate: lowest?.date ?? startDate,
  };
}
