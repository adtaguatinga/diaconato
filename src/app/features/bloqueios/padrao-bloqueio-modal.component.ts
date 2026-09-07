import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Obreiro } from '../../core/models/obreiro.model';
import {
  PadraoBloqueio,
  CreatePadraoBloqueioDto,
  UpdatePadraoBloqueioDto,
  TipoRegraBloqueio,
  DIAS_SEMANA_OPCOES,
  TIPO_REGRA_METADATA
} from '../../core/models/padrao-bloqueio.model';
import { TURNO_LABELS, TurnoEnum } from '../../core/models/turno.enum';

@Component({
  selector: 'app-padrao-bloqueio-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './padrao-bloqueio-modal.component.html'
})
export class PadraoBloqueioModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() obreiros: Obreiro[] = [];
  @Input() padraoParaEditar: PadraoBloqueio | null = null;
  @Input() defaultObreiroId: number | null = null;
  @Input() loading = false;

  @Output() save = new EventEmitter<CreatePadraoBloqueioDto | { id: number; dto: UpdatePadraoBloqueioDto }>();
  @Output() close = new EventEmitter<void>();

  DIAS_SEMANA_OPCOES = DIAS_SEMANA_OPCOES;
  TIPO_REGRA_METADATA = TIPO_REGRA_METADATA;
  TIPOS_REGRA_LIST: TipoRegraBloqueio[] = ['dias_semana', 'paridade', 'faixa_dias', 'semanas_mes', 'dias_mes', 'escala_plantao'];
  TurnoEnum = TurnoEnum;

  getTipoRegraMeta(t: TipoRegraBloqueio) {
    return this.TIPO_REGRA_METADATA[t];
  }

  // Form State
  idObreiro = signal<number | null>(null);
  tipoRegra = signal<TipoRegraBloqueio>('dias_semana');

  // Turnos (Manhã, Tarde, Noite - Todos selecionados = Integral)
  manha = signal<boolean>(true);
  tarde = signal<boolean>(true);
  noite = signal<boolean>(true);

  // Regras
  diasSemanaSelecionados = signal<Set<number>>(new Set()); // Vazio inicialmente para 'dias_semana'
  paridade = signal<'par' | 'impar'>('par');
  diaInicioMes = signal<number>(1);
  diaFimMes = signal<number>(15);
  semanasMesSelecionadas = signal<Set<number>>(new Set([1, 3]));
  diasMesSelecionados = signal<Set<number>>(new Set());
  diasMesInput = signal<string>('');

  // Plantão
  dataBasePlantao = signal<string>(new Date().toISOString().split('T')[0]);
  diasTrabalho = signal<number>(1);
  diasFolga = signal<number>(1);

  // Vigência
  dataInicio = signal<string>(new Date().toISOString().split('T')[0]);
  isIndeterminado = signal<boolean>(true);
  dataFim = signal<string>('');

  ativo = signal<boolean>(true);
  motivo = signal<string>('Indisponibilidade fixa');

  sugestoesMotivo = [
    'Trabalho',
    'Escala de Trabalho / Plantão',
    'Faculdade / Estudos',
    'Família',
    'Viagem',
    'Indisponibilidade fixa'
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      if (this.padraoParaEditar) {
        this.popularFormulario(this.padraoParaEditar);
      } else {
        this.resetFormulario();
        if (this.defaultObreiroId) {
          this.idObreiro.set(this.defaultObreiroId);
        }
      }
    }
  }

  isTodosTurnos(): boolean {
    return this.manha() && this.tarde() && this.noite();
  }

  hasSelectedTurno(): boolean {
    return this.manha() || this.tarde() || this.noite();
  }

  selectAllTurnos(selected: boolean) {
    this.manha.set(selected);
    this.tarde.set(selected);
    this.noite.set(selected);
  }

  getCalculatedTurno(): number {
    const m = this.manha();
    const t = this.tarde();
    const n = this.noite();
    if (m && t && n) return TurnoEnum.INTEGRAL; // 4
    if (m && t) return TurnoEnum.MANHA_TARDE; // 5
    if (m && n) return TurnoEnum.MANHA_NOITE; // 6
    if (t && n) return TurnoEnum.TARDE_NOITE; // 7
    if (m) return TurnoEnum.MANHA; // 1
    if (t) return TurnoEnum.TARDE; // 2
    if (n) return TurnoEnum.NOITE; // 3
    return TurnoEnum.INTEGRAL;
  }

  private popularFormulario(p: PadraoBloqueio) {
    this.idObreiro.set(p.id_obreiro);
    this.tipoRegra.set(p.tipo_regra);

    // Configurar checkboxes de turno
    const t = p.turno;
    if (t === TurnoEnum.INTEGRAL || !t) {
      this.manha.set(true);
      this.tarde.set(true);
      this.noite.set(true);
    } else if (t === TurnoEnum.MANHA) {
      this.manha.set(true);
      this.tarde.set(false);
      this.noite.set(false);
    } else if (t === TurnoEnum.TARDE) {
      this.manha.set(false);
      this.tarde.set(true);
      this.noite.set(false);
    } else if (t === TurnoEnum.NOITE) {
      this.manha.set(false);
      this.tarde.set(false);
      this.noite.set(true);
    } else if (t === TurnoEnum.MANHA_TARDE) {
      this.manha.set(true);
      this.tarde.set(true);
      this.noite.set(false);
    } else if (t === TurnoEnum.MANHA_NOITE) {
      this.manha.set(true);
      this.tarde.set(false);
      this.noite.set(true);
    } else if (t === TurnoEnum.TARDE_NOITE) {
      this.manha.set(false);
      this.tarde.set(true);
      this.noite.set(true);
    }

    this.diasSemanaSelecionados.set(new Set(p.dias_semana || []));
    this.paridade.set(p.paridade || 'par');
    this.diaInicioMes.set(p.dia_inicio_mes || 1);
    this.diaFimMes.set(p.dia_fim_mes || 15);
    this.semanasMesSelecionadas.set(new Set(p.semanas_mes || []));
    this.diasMesSelecionados.set(new Set(p.dias_mes || []));
    this.diasMesInput.set((p.dias_mes || []).join(', '));

    this.dataBasePlantao.set(p.data_base_plantao || p.data_inicio || new Date().toISOString().split('T')[0]);
    this.diasTrabalho.set(p.dias_trabalho || 1);
    this.diasFolga.set(p.dias_folga || 1);

    this.dataInicio.set(p.data_inicio);
    this.isIndeterminado.set(!p.data_fim);
    this.dataFim.set(p.data_fim || '');
    this.ativo.set(p.ativo !== false);
    this.motivo.set(p.motivo || '');
  }

  private resetFormulario() {
    this.idObreiro.set(this.obreiros[0]?.id_obreiro || null);
    this.tipoRegra.set('dias_semana');
    this.manha.set(true);
    this.tarde.set(true);
    this.noite.set(true);
    this.diasSemanaSelecionados.set(new Set()); // Vazio inicialmente para 'dias_semana'
    this.paridade.set('par');
    this.diaInicioMes.set(1);
    this.diaFimMes.set(15);
    this.semanasMesSelecionadas.set(new Set([1, 3]));
    this.diasMesSelecionados.set(new Set());
    this.diasMesInput.set('');

    const hoje = new Date().toISOString().split('T')[0];
    this.dataBasePlantao.set(hoje);
    this.diasTrabalho.set(1);
    this.diasFolga.set(1);
    this.dataInicio.set(hoje);
    this.isIndeterminado.set(true);
    this.dataFim.set('');
    this.ativo.set(true);
    this.motivo.set('Indisponibilidade fixa');
  }

  selecionarTipoRegra(tipo: TipoRegraBloqueio) {
    const tipoAnterior = this.tipoRegra();
    this.tipoRegra.set(tipo);

    // Se mudou para 'dias_semana' vindo de outra regra e todos estavam selecionados, esvazia
    if (tipo === 'dias_semana' && tipoAnterior !== 'dias_semana' && this.diasSemanaSelecionados().size === 7) {
      this.diasSemanaSelecionados.set(new Set());
    } 
    // Se mudou para qualquer outra regra e estava vazio, pré-seleciona todos os 7 dias
    else if (tipo !== 'dias_semana' && this.diasSemanaSelecionados().size === 0) {
      this.diasSemanaSelecionados.set(new Set([1, 2, 3, 4, 5, 6, 7]));
    }
  }

  isFormValido(): boolean {
    if (!this.idObreiro() || !this.hasSelectedTurno() || !this.dataInicio() || this.loading) {
      return false;
    }
    if (this.tipoRegra() === 'dias_semana' && this.diasSemanaSelecionados().size === 0) {
      return false;
    }
    return true;
  }

  activeObreiros = () => {
    return this.obreiros
      .filter(o => o.ativo !== false)
      .sort((a, b) => {
        const nomeA = a.apelido || a.nome;
        const nomeB = b.apelido || b.nome;
        return nomeA.localeCompare(nomeB);
      });
  };

  getInitials(name?: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Dias da Semana Helpers
  toggleDiaSemana(dia: number) {
    const set = new Set(this.diasSemanaSelecionados());
    if (set.has(dia)) {
      set.delete(dia);
    } else {
      set.add(dia);
    }
    this.diasSemanaSelecionados.set(set);
  }

  selecionarAtalhoDias(atalho: 'todos' | 'uteis' | 'fim_semana' | 'domingos') {
    switch (atalho) {
      case 'todos':
        this.diasSemanaSelecionados.set(new Set([1, 2, 3, 4, 5, 6, 7]));
        break;
      case 'uteis':
        this.diasSemanaSelecionados.set(new Set([2, 3, 4, 5, 6]));
        break;
      case 'fim_semana':
        this.diasSemanaSelecionados.set(new Set([1, 7]));
        break;
      case 'domingos':
        this.diasSemanaSelecionados.set(new Set([1]));
        break;
    }
  }

  toggleSemanaMes(sem: number) {
    const set = new Set(this.semanasMesSelecionadas());
    if (set.has(sem)) {
      set.delete(sem);
    } else {
      set.add(sem);
    }
    this.semanasMesSelecionadas.set(set);
  }

  aplicarMotivoSugestao(sugestao: string) {
    this.motivo.set(sugestao);
  }

  onCancel() {
    this.close.emit();
  }

  onSubmit() {
    const obId = this.idObreiro();
    if (!obId || !this.hasSelectedTurno()) return;

    // Processar dias_mes do input se for o caso
    let parsedDiasMes: number[] = [];
    if (this.tipoRegra() === 'dias_mes') {
      parsedDiasMes = this.diasMesInput()
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 31);
    }

    const dto: CreatePadraoBloqueioDto = {
      id_obreiro: obId,
      tipo_regra: this.tipoRegra(),
      turno: this.getCalculatedTurno(),
      dias_semana: Array.from(this.diasSemanaSelecionados()).sort((a, b) => a - b),
      paridade: this.tipoRegra() === 'paridade' ? this.paridade() : null,
      dia_inicio_mes: this.tipoRegra() === 'faixa_dias' ? Number(this.diaInicioMes()) : null,
      dia_fim_mes: this.tipoRegra() === 'faixa_dias' ? Number(this.diaFimMes()) : null,
      semanas_mes: this.tipoRegra() === 'semanas_mes' ? Array.from(this.semanasMesSelecionadas()).sort((a, b) => a - b) : [],
      dias_mes: parsedDiasMes,
      data_base_plantao: this.tipoRegra() === 'escala_plantao' ? this.dataBasePlantao() : null,
      dias_trabalho: this.tipoRegra() === 'escala_plantao' ? Number(this.diasTrabalho()) : null,
      dias_folga: this.tipoRegra() === 'escala_plantao' ? Number(this.diasFolga()) : null,
      data_inicio: this.dataInicio(),
      data_fim: !this.isIndeterminado() && this.dataFim() ? this.dataFim() : null,
      ativo: this.ativo(),
      motivo: this.motivo().trim() || 'Indisponibilidade fixa'
    };

    if (this.padraoParaEditar?.id_padrao_bloqueio) {
      this.save.emit({
        id: this.padraoParaEditar.id_padrao_bloqueio,
        dto
      });
    } else {
      this.save.emit(dto);
    }
  }
}
