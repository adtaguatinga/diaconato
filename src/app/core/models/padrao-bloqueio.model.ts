import { Obreiro } from './obreiro.model';
import { TURNO_LABELS } from './turno.enum';

export type TipoRegraBloqueio =
  | 'dias_semana'    // Dias específicos da semana (ex: Domingo, Quinta)
  | 'paridade'       // Dias pares ou ímpares
  | 'faixa_dias'     // Intervalo de dias do mês (ex: 1 a 15)
  | 'semanas_mes'    // Semanas específicas do mês (ex: 1ª e 3ª semana)
  | 'dias_mes'       // Dias fixos do mês (ex: dia 5 e 20)
  | 'escala_plantao'; // Escala cíclica / Plantão (ex: 12x36, 1 dia sim 1 dia não)

export interface PadraoBloqueio {
  id_padrao_bloqueio?: number;
  id_obreiro: number;
  tipo_regra: TipoRegraBloqueio;

  // Parâmetros
  dias_semana?: number[];       // [1..7] onde 1=Dom, 2=Seg, 3=Ter, 4=Qua, 5=Qui, 6=Sex, 7=Sáb
  turno: number;                // 1=Manhã, 2=Tarde, 3=Noite, 4=Integral
  paridade?: 'par' | 'impar' | null;
  dia_inicio_mes?: number | null; // 1..31
  dia_fim_mes?: number | null;    // 1..31
  semanas_mes?: number[];       // [1..5]
  dias_mes?: number[];          // [1..31]

  // Escala / Plantão cíclico
  data_base_plantao?: string | null; // 'YYYY-MM-DD'
  dias_trabalho?: number | null;     // Ex: 1
  dias_folga?: number | null;        // Ex: 1 ou 2

  // Vigência
  data_inicio: string;          // 'YYYY-MM-DD'
  data_fim?: string | null;     // 'YYYY-MM-DD' ou null (indeterminado)

  // Metadados
  ativo: boolean;
  motivo?: string | null;
  criado_em?: string;
  atualizado_em?: string;

  // Relações
  obreiros?: Obreiro;
}

export type CreatePadraoBloqueioDto = Omit<PadraoBloqueio, 'id_padrao_bloqueio' | 'criado_em' | 'atualizado_em' | 'obreiros'>;
export type UpdatePadraoBloqueioDto = Partial<CreatePadraoBloqueioDto>;

export const DIAS_SEMANA_OPCOES = [
  { valor: 1, label: 'Domingo', abrev: 'Dom' },
  { valor: 2, label: 'Segunda-feira', abrev: 'Seg' },
  { valor: 3, label: 'Terça-feira', abrev: 'Ter' },
  { valor: 4, label: 'Quarta-feira', abrev: 'Qua' },
  { valor: 5, label: 'Quinta-feira', abrev: 'Qui' },
  { valor: 6, label: 'Sexta-feira', abrev: 'Sex' },
  { valor: 7, label: 'Sábado', abrev: 'Sáb' },
];

export const TIPO_REGRA_METADATA: Record<TipoRegraBloqueio, { label: string; icone: string; descricao: string }> = {
  dias_semana: {
    label: 'Dias da Semana',
    icone: '📅',
    descricao: 'Bloquear em dias fixos da semana (ex: todos os domingos ou quintas)'
  },
  paridade: {
    label: 'Escala de Plantão (Pares / Ímpares)',
    icone: '🔄',
    descricao: 'Bloquear por plantão em dias pares ou dias ímpares'
  },
  faixa_dias: {
    label: 'Faixa de Dias do Mês',
    icone: '📆',
    descricao: 'Bloquear em um intervalo de dias do mês'
  },
  semanas_mes: {
    label: 'Semanas do Mês',
    icone: '🗓️',
    descricao: 'Bloquear em semanas específicas'
  },
  dias_mes: {
    label: 'Dias Específicos do Mês',
    icone: '🎯',
    descricao: 'Bloquear em dias fixos todo mês'
  },
  escala_plantao: {
    label: 'Escala de Plantão',
    icone: '🔄',
    descricao: 'Bloquear por escala de plantão'
  }
};

/**
 * Gera uma descrição amigável e legível para um padrão de bloqueio.
 */
export function formatarDescricaoRegra(padrao: PadraoBloqueio): string {
  const turnoTxt = TURNO_LABELS[padrao.turno as keyof typeof TURNO_LABELS] || 'Integral';

  let regraTxt = '';
  switch (padrao.tipo_regra) {
    case 'dias_semana': {
      const dias = padrao.dias_semana || [];
      if (dias.length === 0) {
        regraTxt = 'Nenhum dia selecionado';
      } else if (dias.length === 7) {
        regraTxt = 'Todos os dias da semana';
      } else if (dias.length === 5 && [2, 3, 4, 5, 6].every(d => dias.includes(d))) {
        regraTxt = 'Dias úteis (Seg a Sex)';
      } else if (dias.length === 2 && dias.includes(1) && dias.includes(7)) {
        regraTxt = 'Finais de semana (Sáb e Dom)';
      } else {
        const nomes = dias.map(d => DIAS_SEMANA_OPCOES.find(o => o.valor === d)?.abrev || String(d));
        regraTxt = nomes.join(', ');
      }
      break;
    }
    case 'paridade': {
      const parTxt = padrao.paridade === 'par' ? 'Plantão em Dias Pares' : 'Plantão em Dias Ímpares';
      const dias = (padrao.dias_semana || []).map(d => DIAS_SEMANA_OPCOES.find(o => o.valor === d)?.abrev || String(d));
      const diasTxt = (dias.length > 0 && dias.length < 7) ? ` (${dias.join(', ')})` : '';
      regraTxt = `${parTxt}${diasTxt}`;
      break;
    }
    case 'faixa_dias': {
      const ini = padrao.dia_inicio_mes || 1;
      const fim = padrao.dia_fim_mes || 31;
      const dias = (padrao.dias_semana || []).map(d => DIAS_SEMANA_OPCOES.find(o => o.valor === d)?.abrev || String(d));
      const diasTxt = (dias.length > 0 && dias.length < 7) ? ` (${dias.join(', ')})` : '';
      regraTxt = `Dias ${ini} a ${fim}${diasTxt}`;
      break;
    }
    case 'semanas_mes': {
      const semanas = (padrao.semanas_mes || []).map(s => `${s}ª sem`).join(', ');
      const dias = (padrao.dias_semana || []).map(d => DIAS_SEMANA_OPCOES.find(o => o.valor === d)?.abrev || String(d));
      const diasTxt = dias.length > 0 ? ` (${dias.join(', ')})` : '';
      regraTxt = semanas ? `Semanas: ${semanas}${diasTxt}` : 'Semanas específicas';
      break;
    }
    case 'dias_mes': {
      const dias = (padrao.dias_mes || []).join(', ');
      regraTxt = dias ? `Dias fixos: ${dias}` : 'Dias específicos';
      break;
    }
    case 'escala_plantao': {
      const dias = (padrao.dias_semana || []).map(d => DIAS_SEMANA_OPCOES.find(o => o.valor === d)?.abrev || String(d));
      const diasTxt = (dias.length > 0 && dias.length < 7) ? ` (${dias.join(', ')})` : '';
      regraTxt = `Plantão ${padrao.dias_trabalho || 1}x${padrao.dias_folga || 1}${diasTxt}`;
      break;
    }
    default:
      regraTxt = 'Regra personalizada';
  }

  return `${regraTxt} • Turno ${turnoTxt}`;
}
