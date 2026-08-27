import { useEffect, useState } from 'react';

/** Abaixo disto o prazo vira aviso vermelho em vez de informação neutra. */
const HORAS_URGENTE = 3;
/** De quanto em quanto tempo a contagem se atualiza sozinha na tela. */
const PASSO_MS = 30_000;

export interface Prazo {
  /** "18h 42min", "45 min", "expirado" */
  texto: string;
  vencido: boolean;
  /** Falta pouco: a tela pinta de vermelho. */
  urgente: boolean;
}

export function calcularPrazo(expiraEm: string, agora = Date.now()): Prazo {
  const restante = new Date(expiraEm).getTime() - agora;
  if (!Number.isFinite(restante) || restante <= 0) {
    return { texto: 'expirado', vencido: true, urgente: true };
  }

  const minutos = Math.floor(restante / 60_000);
  const horas = Math.floor(minutos / 60);
  const urgente = restante < HORAS_URGENTE * 60 * 60 * 1000;

  // Acima de uma hora os minutos ainda importam ("2h 5min" é bem diferente de
  // "2h 55min"); abaixo, só os minutos.
  if (horas >= 1) return { texto: `${horas}h ${minutos % 60}min`, vencido: false, urgente };
  return { texto: `${minutos} min`, vencido: false, urgente };
}

/**
 * Igual ao anterior, mas se atualiza sozinho enquanto a tela está aberta — sem
 * isso o cliente veria "3h 00min" congelado enquanto o tempo passa.
 */
export function usePrazo(expiraEm: string | null | undefined): Prazo | null {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!expiraEm) return;
    const timer = setInterval(() => setAgora(Date.now()), PASSO_MS);
    return () => clearInterval(timer);
  }, [expiraEm]);

  if (!expiraEm) return null;
  return calcularPrazo(expiraEm, agora);
}
