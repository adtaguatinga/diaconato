export enum TurnoEnum {
  MANHA = 1,
  TARDE = 2,
  NOITE = 3,
  INTEGRAL = 4,
  MANHA_TARDE = 5,
  MANHA_NOITE = 6,
  TARDE_NOITE = 7
}

export const TURNO_LABELS: Record<number, string> = {
  [TurnoEnum.MANHA]: 'Manhã',
  [TurnoEnum.TARDE]: 'Tarde',
  [TurnoEnum.NOITE]: 'Noite',
  [TurnoEnum.INTEGRAL]: 'Dia Inteiro',
  [TurnoEnum.MANHA_TARDE]: 'Manhã e Tarde',
  [TurnoEnum.MANHA_NOITE]: 'Manhã e Noite',
  [TurnoEnum.TARDE_NOITE]: 'Tarde e Noite'
};

export const TURNO_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  [TurnoEnum.MANHA]: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  [TurnoEnum.TARDE]: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  [TurnoEnum.NOITE]: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  [TurnoEnum.INTEGRAL]: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  [TurnoEnum.MANHA_TARDE]: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  [TurnoEnum.MANHA_NOITE]: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  [TurnoEnum.TARDE_NOITE]: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' }
};

export function expandirTurnos(turno: number): number[] {
  switch (turno) {
    case TurnoEnum.MANHA: return [TurnoEnum.MANHA];
    case TurnoEnum.TARDE: return [TurnoEnum.TARDE];
    case TurnoEnum.NOITE: return [TurnoEnum.NOITE];
    case TurnoEnum.INTEGRAL: return [TurnoEnum.INTEGRAL];
    case TurnoEnum.MANHA_TARDE: return [TurnoEnum.MANHA, TurnoEnum.TARDE];
    case TurnoEnum.MANHA_NOITE: return [TurnoEnum.MANHA, TurnoEnum.NOITE];
    case TurnoEnum.TARDE_NOITE: return [TurnoEnum.TARDE, TurnoEnum.NOITE];
    default: return [TurnoEnum.INTEGRAL];
  }
}
