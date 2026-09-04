export const parseLocalDate = (value) => {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
};

export const toLocalIso = (value) => {
  const date = parseLocalDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayLocalIso = () => toLocalIso(new Date());

export const formatDateBr = (value, options = {}) =>
  parseLocalDate(value).toLocaleDateString("pt-BR", options);
