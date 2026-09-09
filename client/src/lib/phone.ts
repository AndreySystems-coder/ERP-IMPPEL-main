// Formata um número enquanto o usuário digita: prefixa +55 automaticamente e organiza
// DDD entre parênteses, já que por enquanto todo contato cadastrado é do Brasil.
export function formatBrazilPhone(raw: string): string {
  // O "+55" abaixo é inserido por esta própria função. Como o campo é controlado (o valor
  // formatado volta como entrada na tecla seguinte), é preciso remover esse prefixo ANTES de
  // extrair dígitos — senão o "55" já exibido é recontado como se o usuário tivesse digitado
  // de novo a cada tecla, e o número vai enchendo de "5" sozinho sem forma de apagar.
  let value = raw.trim();
  if (value.startsWith("+55")) value = value.slice(3);
  let digits = value.replace(/\D/g, "");
  // Só remove um "55" de código de país colado inteiro (13 dígitos: 55 + DDD + número) —
  // nunca durante a digitação normal, para não atrapalhar quem tem DDD 55 de verdade.
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
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

// Formata CPF (11 dígitos) ou CNPJ (12-14 dígitos) enquanto o usuário digita. Só usa pontuação
// (., /, -), nunca dígitos fixos, então é seguro reprocessar o próprio valor formatado a cada tecla.
export function formatCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
