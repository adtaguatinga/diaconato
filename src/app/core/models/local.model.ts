import { Area, getAreaBadgeStyle } from './area.model';

export interface Local {
  id_local: number;
  id_area: number;
  nome: string;
  descricao?: string | null;
  ordem: number;
  ativo: boolean;
  posicao_x?: number | null; // Percentual de 0 a 100
  posicao_y?: number | null; // Percentual de 0 a 100
  numero_posto?: number | null;
  cor_pino?: string | null;
  icone_pino?: string | null;
  criado_em?: string;
  areas?: Area; // Relacionamento com tabela areas
}

export interface CreateLocalDto {
  id_area: number;
  nome: string;
  descricao?: string | null;
  ordem?: number;
  ativo?: boolean;
  posicao_x?: number | null;
  posicao_y?: number | null;
  numero_posto?: number | null;
  cor_pino?: string | null;
  icone_pino?: string | null;
}

export interface UpdateLocalDto {
  id_area?: number;
  nome?: string;
  descricao?: string | null;
  ordem?: number;
  ativo?: boolean;
  posicao_x?: number | null;
  posicao_y?: number | null;
  numero_posto?: number | null;
  cor_pino?: string | null;
  icone_pino?: string | null;
}

export function getAreaStyle(areaNome?: string) {
  return getAreaBadgeStyle(areaNome || '');
}
