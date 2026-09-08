export interface Area {
  id_area: number;
  nome: string;
  descricao?: string | null;
  icone?: string | null;
  mapa_url?: string | null;
  mapa_nome?: string | null;
  ativo: boolean;
  criado_em?: string;
}

export interface CreateAreaDto {
  nome: string;
  descricao?: string | null;
  icone?: string | null;
  mapa_url?: string | null;
  mapa_nome?: string | null;
  ativo?: boolean;
}

export interface UpdateAreaDto {
  nome?: string;
  descricao?: string | null;
  icone?: string | null;
  mapa_url?: string | null;
  mapa_nome?: string | null;
  ativo?: boolean;
}

export const AREA_ICONS: string[] = ['🏛️', '🚗', '👶', '🏢', '🚪', '🌲', '📍', '🛡️'];

export function getAreaBadgeStyle(nome: string) {
  const normalized = nome?.trim().toLowerCase() || '';
  if (normalized.includes('igreja') || normalized.includes('templo') || normalized.includes('nave')) {
    return {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      icon: '🏛️'
    };
  }
  if (normalized.includes('estacionamento') || normalized.includes('carro') || normalized.includes('vaga') || normalized.includes('samu')) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: '🚗'
    };
  }
  if (normalized.includes('infantil') || normalized.includes('criança') || normalized.includes('berçário')) {
    return {
      bg: 'bg-pink-500/10',
      text: 'text-pink-400',
      border: 'border-pink-500/30',
      icon: '👶'
    };
  }
  return {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    icon: '📍'
  };
}
