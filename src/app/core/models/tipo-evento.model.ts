export interface TipoEvento {
  id_tipo_evento?: number;
  descricao_padrao: string;
  dia_semana_padrao?: number | null; // 1 (Domingo) a 7 (Sábado)
  turno_padrao: number; // 1: Manhã, 2: Tarde, 3: Noite
  n_primeiro_horario_padrao: number;
  exclusivo_diacono_primeiro_padrao: boolean;
  n_segundo_horario_padrao: number;
  exclusivo_diacono_segundo_padrao: boolean;
  n_terceiro_horario_padrao: number;
  exclusivo_diacono_terceiro_padrao: boolean;
  pulpito_primeiro: boolean;
  pulpito_segundo: boolean;
  pulpito_terceiro: boolean;
  areas_ids?: number[];
  criado_em?: string;
}

export type CreateTipoEventoDto = Omit<TipoEvento, 'id_tipo_evento' | 'criado_em'>;
export type UpdateTipoEventoDto = Partial<CreateTipoEventoDto>;

export const DIAS_SEMANA_LABELS: Record<number, string> = {
  1: 'Domingo',
  2: 'Segunda-feira',
  3: 'Terça-feira',
  4: 'Quarta-feira',
  5: 'Quinta-feira',
  6: 'Sexta-feira',
  7: 'Sábado'
};