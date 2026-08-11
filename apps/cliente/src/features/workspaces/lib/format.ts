/** Máximos de tamanho de campo (Open Question #4 — valores provisórios). */
export const LIMITS = {
  workspaceName: 80,
  personName: 120,
  email: 160,
} as const;

/** Remove tudo que não é dígito. Usado para normalizar CNPJ antes de comparar. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Aplica máscara visual de CNPJ: 00.000.000/0000-00 */
export function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  let out = d;
  if (d.length > 2) out = `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length > 5) out = `${out.slice(0, 6)}.${out.slice(6)}`;
  if (d.length > 8) out = `${out.slice(0, 10)}/${out.slice(10)}`;
  if (d.length > 12) out = `${out.slice(0, 15)}-${out.slice(15)}`;
  return out;
}

/**
 * Validação de CNPJ com dígitos verificadores.
 * Rejeita formatos inválidos e sequências repetidas (00000000000000).
 */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj.slice(0, 12), w1);
  const d2 = calc(cnpj.slice(0, 12) + d1, w2);
  return cnpj.endsWith(`${d1}${d2}`);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function formatCnpjForDisplay(cnpj: string): string {
  return maskCnpj(cnpj);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Rótulo de exibição para uma função. */
export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "administrador":
      return "Administrador";
    case "editor":
      return "Editor";
    case "observador":
      return "Observador";
    default:
      return "Sem função";
  }
}

/** Data e hora para exibição de último acesso. */
export function formatLastAccess(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Iniciais para avatar (até 2 letras). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
