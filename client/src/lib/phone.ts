// Formata um número enquanto o usuário digita: prefixa +55 automaticamente e organiza
// DDD entre parênteses, já que por enquanto todo contato cadastrado é do Brasil.
export function formatBrazilPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (!ddd) return "+55";

  let formatted = `+55 (${ddd}${ddd.length === 2 ? ")" : ""}`;
  if (rest) {
    const splitAt = rest.length > 8 ? 5 : 4;
    const part1 = rest.slice(0, splitAt);
    const part2 = rest.slice(splitAt);
    formatted += ` ${part1}${part2 ? `-${part2}` : ""}`;
  }
  return formatted;
}
