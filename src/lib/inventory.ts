export function validStock(value: string) {
  if (!value.trim()) return null;
  const stock = Number(value);
  return Number.isInteger(stock) && stock >= 0 ? stock : null;
}
