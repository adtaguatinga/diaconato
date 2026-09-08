import { Mes } from './mes.model';

export interface Evento {
  id_evento?: number;
  id_mes: number;
  data: string;
  descricao?: string | null;
  turno: number; // 1: Manhã, 2: Tarde, 3: Noite
  n_primeiro_horario: number;
  exclusivo_diacono_primeiro: boolean;
  n_segundo_horario: number;
  exclusivo_diacono_segundo: boolean;
  n_terceiro_horario: number;
  exclusivo_diacono_terceiro: boolean;
  pulpito_primeiro: boolean;
  pulpito_segundo: boolean;
  pulpito_terceiro: boolean;
  // Gestão Operacional do Culto
  traje_tipo?: 'Camisa Preta' | 'Camisa Vinho' | 'Camisa Cinza' | 'Terno' | string;
  terno_cor_obrigatoria?: boolean;
  terno_cor?: string | null;
  gravata_cor_obrigatoria?: boolean;
  gravata_cor?: string | null;
  camisa_cor_obrigatoria?: boolean;
  camisa_cor?: string | null;
  cracha_obrigatorio?: boolean;
  lideres_responsaveis_ids?: number[];
  areas_ids?: number[];
  criado_em?: string;
  mes?: Mes;
}

export type CreateEventoDto = Omit<Evento, 'id_evento' | 'criado_em' | 'mes'>;
export type UpdateEventoDto = Partial<CreateEventoDto>;
