import { Component, OnInit, ChangeDetectorRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventoOperacaoService } from '../../core/services/evento-operacao.service';
import { AreaService } from '../../core/services/area.service';
import { LocalService } from '../../core/services/local.service';
import { ObreiroService } from '../../core/services/obreiro.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SupabaseService } from '../../core/services/supabase.service';
import {
  TRAJE_OPCOES,
  CORES_TERNO,
  CORES_GRAVATA,
  CORES_CAMISA,
  TrajeTipo,
  TrajeAndLideresConfigDto,
  SaveAreaHorarioDto,
  EventoAreaHorario
} from '../../core/models/evento-operacao.model';
import { Area, getAreaBadgeStyle } from '../../core/models/area.model';
import { Escala } from '../../core/models/escala.model';
import { Local } from '../../core/models/local.model';

export interface TurnoOption {
  id: number;
  label: string;
  maxVagas: number;
}

export interface SetorAlocacaoGroup {
  area: Area;
  escalas: Escala[];
}

export interface TurnoCardGroup {
  id: number;
  label: string;
  maxVagas: number;
  setores: SetorAlocacaoGroup[];
  alocadosCount: number;
}

export interface ObreiroHistoricoAno {
  ano: number;
  idObreiro: number;
  nomeObreiro: string;
  totalEscalasAno: number;
  horariosCount: { [turnoId: number]: number };
  horarioMenosAtuadoId: number;
  horarioMenosAtuadoLabel: string;
  horarioMenosAtuadoQtd: number;
  postosCount: { [idLocal: number]: number };
  postoMenosAtuadoNome: string;
  postoMenosAtuadoQtd: number;
  locaisMenosAtuadosIds: number[];
}

import { EventoMapaModalComponent } from './evento-mapa-modal.component';

export interface ObreiroPostoCandidate {
  escala: Escala;
  nome: string;
  isDiacono: boolean;
  isPulpito: boolean;
  isLider: boolean;
  isPendente: boolean;
  postoAtualNome?: string;
  horarioAtualLabel?: string;
  escalasNoPostoAno: number;
  escalasNoTurnoAno: number;
  totalEscalasAno: number;
  isMenosAtuouNoPosto: boolean;
  isMenosAtuouNoTurno: boolean;
}

@Component({
  selector: 'app-evento-detalhes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EventoMapaModalComponent],
  templateUrl: './evento-detalhes.component.html'
})
export class EventoDetalhesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  private supabase = inject(SupabaseService).client;
  public operacaoService = inject(EventoOperacaoService);
  public areaService = inject(AreaService);
  public localService = inject(LocalService);
  public obreiroService = inject(ObreiroService);
  public authService = inject(AuthService);

  idEvento = signal<number>(0);
  isShareModalOpen = signal<boolean>(false);
  isMapaTaticoOpen = signal<boolean>(false);
  mapaDefaultAreaId = signal<number | null>(null);
  mapaDefaultHorario = signal<number | null>(null);

  openMapaTatico(defaultAreaId?: number | null, defaultHorario?: number | null) {
    this.mapaDefaultAreaId.set(defaultAreaId || null);
    this.mapaDefaultHorario.set(defaultHorario || null);
    this.isMapaTaticoOpen.set(true);
  }

  // Constantes de Traje
  trajeOpcoes = TRAJE_OPCOES;
  coresTerno = CORES_TERNO;
  coresGravata = CORES_GRAVATA;
  coresCamisa = CORES_CAMISA;
  getAreaBadgeStyle = getAreaBadgeStyle;

  formatDataEvento(dataStr?: string): string {
    if (!dataStr) return '';
    try {
      const parts = dataStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const diaSemana = diasSemana[d.getDay()];
        return `${diaSemana}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (_) { }
    return dataStr;
  }

  getDiaSemana(dataStr?: string): string {
    if (!dataStr) return '';
    try {
      const parts = dataStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return diasSemana[d.getDay()];
      }
    } catch (_) { }
    return '';
  }

  formatHoraAmPm(timeStr?: string): string {
    if (!timeStr) return '';
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0');
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes}${ampm}`;
  }

  // Formulário de Traje & Liderança em Signal Reativo
  trajeConfig = signal<TrajeAndLideresConfigDto>({
    traje_tipo: 'Camisa Preta',
    terno_cor_obrigatoria: false,
    terno_cor: 'Preto',
    gravata_cor_obrigatoria: false,
    gravata_cor: 'Vermelho',
    camisa_cor_obrigatoria: false,
    camisa_cor: 'Branca',
    cracha_obrigatorio: true,
    lideres_responsaveis_ids: []
  });

  // Formulário Novo Horário por Setor
  novoHorario: SaveAreaHorarioDto = {
    id_area: 1,
    horario_turno: 1,
    hora_inicio: '18:00',
    hora_fim: '21:00'
  };

  // Filtros de Postos
  filtroTurnoPosto = signal<string | number>('TODOS');
  filtroAreaPosto = signal<string | number>('TODAS');
  filtroStatusPosto = signal<string>('TODOS');

  filtroTurno = computed(() => this.filtroTurnoPosto());
  filtroArea = computed(() => this.filtroAreaPosto());
  filtroStatus = computed(() => this.filtroStatusPosto());

  // Lista de Diáconos Líderes (estritamente obreiros com flag lider = true)
  diaconosLideres = computed(() => {
    return this.obreiroService.obreiros()
      .filter(o => o.ativo && o.lider)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  });

  // Estatísticas de Alocação
  totalEscalados = computed(() => this.operacaoService.escalas().length);
  totalAlocados = computed(() => this.operacaoService.escalas().filter(e => !!e.id_local).length);
  totalPendentes = computed(() => this.totalEscalados() - this.totalAlocados());
  percentualCobertura = computed(() => {
    const tot = this.totalEscalados();
    if (tot === 0) return 0;
    return Math.round((this.totalAlocados() / tot) * 100);
  });

  // Horários disponíveis configurados no evento (1º, 2º, 3º)
  turnosDisponiveis = computed<TurnoOption[]>(() => {
    const ev = this.operacaoService.evento();
    if (!ev) return [{ id: 1, label: '1º Horário', maxVagas: 10 }];
    const turnos: TurnoOption[] = [];
    if ((ev.n_primeiro_horario ?? 0) > 0) turnos.push({ id: 1, label: '1º Horário', maxVagas: ev.n_primeiro_horario });
    if ((ev.n_segundo_horario ?? 0) > 0) turnos.push({ id: 2, label: '2º Horário', maxVagas: ev.n_segundo_horario });
    if ((ev.n_terceiro_horario ?? 0) > 0) turnos.push({ id: 3, label: '3º Horário', maxVagas: ev.n_terceiro_horario });
    return turnos.length > 0 ? turnos : [{ id: 1, label: '1º Horário', maxVagas: 10 }];
  });

  isEventoSantaCeia = computed<boolean>(() => {
    const ev = this.operacaoService.evento();
    if (!ev) return false;
    const desc = (ev.descricao || '').toLowerCase();
    return desc.includes('ceia');
  });

  // Áreas ativas e filtradas para o evento:
  // - Se for "Santa Ceia": APENAS a área "Ceia" é apresentada.
  // - Se NÃO for "Santa Ceia": todas as áreas ativas, EXCETO a área "Ceia", são apresentadas.
  areasEvento = computed<Area[]>(() => {
    const areas = this.areaService.areas().filter(a => a.ativo);
    const isCeia = this.isEventoSantaCeia();
    return areas.filter(a => {
      const nomeArea = (a.nome || '').toLowerCase();
      const isAreaCeia = nomeArea.includes('ceia');
      if (isCeia) {
        return isAreaCeia;
      } else {
        return !isAreaCeia;
      }
    });
  });

  // Grupos de Escala organizados por Horário / Turno e agrupados por Setor
  gruposPorTurno = computed<TurnoCardGroup[]>(() => {
    const turnos = this.turnosDisponiveis();
    const allEscalas = this.operacaoService.escalas();
    const allAreas = this.areasEvento();
    const filtroTurno = this.filtroTurnoPosto();
    const areaId = this.filtroAreaPosto();
    const status = this.filtroStatusPosto();

    const turnosFiltrados = filtroTurno === 'TODOS'
      ? turnos
      : turnos.filter(t => t.id === Number(filtroTurno));

    return turnosFiltrados.map(t => {
      // Filtrar obreiros com posto alocado no turno
      let items = allEscalas.filter(e => !!e.id_local && Number(e.horario_turno ?? 1) === t.id);

      if (areaId !== 'TODAS') {
        const numArea = Number(areaId);
        items = items.filter(e => Number(e.locais?.id_area) === numArea);
      }

      if (status === 'PENDENTES') {
        items = [];
      }

      // Agrupar por Setor / Área
      const setoresMap: SetorAlocacaoGroup[] = [];

      for (const area of allAreas) {
        if (areaId !== 'TODAS' && Number(areaId) !== area.id_area) continue;
        const escalasArea = items.filter(e => Number(e.locais?.id_area) === area.id_area);
        setoresMap.push({
          area,
          escalas: escalasArea
        });
      }

      // Caso haja algum com área não mapeada nas áreas cadastradas (apenas se NÃO for Santa Ceia)
      if (!this.isEventoSantaCeia()) {
        const mappedAreaIds = new Set(allAreas.map(a => a.id_area));
        const outros = items.filter(e => !mappedAreaIds.has(Number(e.locais?.id_area)));
        if (outros.length > 0) {
          setoresMap.push({
            area: { id_area: 0, nome: 'Outros Setores', icone: '📍', ativo: true },
            escalas: outros
          });
        }
      }

      return {
        id: t.id,
        label: t.label,
        maxVagas: t.maxVagas,
        setores: setoresMap,
        alocadosCount: items.length
      };
    });
  });

  // Obreiros ainda sem nenhum posto definido (Pendentes)
  obreirosSemPosto = computed(() => {
    const allEscalas = this.operacaoService.escalas();
    const status = this.filtroStatusPosto();
    if (status === 'ALOCADOS') return [];
    return allEscalas.filter(e => !e.id_local);
  });

  onFiltroTurnoChanged(val: any) {
    this.filtroTurnoPosto.set(val === 'TODOS' ? 'TODOS' : Number(val));
    this.cdr.markForCheck();
  }

  onFiltroAreaChanged(val: any) {
    this.filtroAreaPosto.set(val === 'TODAS' ? 'TODAS' : Number(val));
    this.cdr.markForCheck();
  }

  onFiltroStatusChanged(val: any) {
    this.filtroStatusPosto.set(val);
    this.cdr.markForCheck();
  }

  ngOnInit() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.idEvento.set(id);
        this.carregarDados(id);
      }
    });

    this.areaService.fetchAreas();
    this.localService.fetchLocais();
    this.obreiroService.fetchAll();
  }

  async carregarDados(id: number) {
    await this.operacaoService.loadEventoOperacao(id);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const ev = this.operacaoService.evento();
    if (ev) {
      this.trajeConfig.set({
        traje_tipo: (ev.traje_tipo as TrajeTipo) || 'Camisa Preta',
        terno_cor_obrigatoria: ev.terno_cor_obrigatoria ?? false,
        terno_cor: ev.terno_cor || 'Preto',
        gravata_cor_obrigatoria: ev.gravata_cor_obrigatoria ?? false,
        gravata_cor: ev.gravata_cor || 'Vermelho',
        camisa_cor_obrigatoria: ev.camisa_cor_obrigatoria ?? false,
        camisa_cor: ev.camisa_cor || 'Branca',
        cracha_obrigatorio: ev.cracha_obrigatorio ?? true,
        lideres_responsaveis_ids: ev.lideres_responsaveis_ids || []
      });
    }
    this.cdr.markForCheck();
  }

  // --- Ações de Traje & Liderança ---
  async setTrajeTipo(tipo: TrajeTipo) {
    this.trajeConfig.update(prev => ({ ...prev, traje_tipo: tipo }));
    await this.salvarTrajeELideres();
  }

  async updateTrajeField(field: keyof TrajeAndLideresConfigDto, value: any) {
    this.trajeConfig.update(prev => ({ ...prev, [field]: value }));
    await this.salvarTrajeELideres();
  }

  async toggleLider(idObreiro?: number) {
    if (!idObreiro) return;
    const current = this.trajeConfig().lideres_responsaveis_ids || [];
    const updated = current.includes(idObreiro)
      ? current.filter(id => id !== idObreiro)
      : [...current, idObreiro];

    this.trajeConfig.update(prev => ({ ...prev, lideres_responsaveis_ids: updated }));
    await this.salvarTrajeELideres();
  }

  isLiderSelecionado(idObreiro?: number): boolean {
    if (!idObreiro) return false;
    return (this.trajeConfig().lideres_responsaveis_ids || []).includes(idObreiro);
  }

  async salvarTrajeELideres() {
    await this.operacaoService.saveTrajeAndLideres(this.idEvento(), this.trajeConfig());
    this.cdr.markForCheck();
  }

  // --- Modal Seletor de Cores de Terno / Gravata / Camisa ---
  activeColorPickerField = signal<'terno_cor' | 'gravata_cor' | 'camisa_cor' | null>(null);

  openColorPicker(field: 'terno_cor' | 'gravata_cor' | 'camisa_cor') {
    if (!this.authService.canManageOperacao()) return;
    this.activeColorPickerField.set(field);
  }

  closeColorPicker() {
    this.activeColorPickerField.set(null);
  }

  getColorPickerTitle(): string {
    const field = this.activeColorPickerField();
    if (field === 'terno_cor') return 'Cor Obrigatória do Terno';
    if (field === 'gravata_cor') return 'Cor Obrigatória da Gravata';
    if (field === 'camisa_cor') return 'Cor Obrigatória da Camisa';
    return 'Escolher Cor';
  }

  getColorPickerOptions(): string[] {
    const field = this.activeColorPickerField();
    if (field === 'terno_cor') return this.coresTerno;
    if (field === 'gravata_cor') return this.coresGravata;
    if (field === 'camisa_cor') return this.coresCamisa;
    return [];
  }

  getColorPickerCurrentValue(): string {
    const field = this.activeColorPickerField();
    if (!field) return '';
    return (this.trajeConfig()[field] as string) || '';
  }

  getColorHex(cor: string): string {
    const lower = (cor || '').toLowerCase();
    if (lower.includes('preto') || lower.includes('preta')) return '#18181b';
    if (lower.includes('marinho')) return '#172554';
    if (lower.includes('royal') || lower.includes('caneta') || lower.includes('bic')) return '#1d4ed8';
    if (lower.includes('petróleo')) return '#0e7490';
    if (lower.includes('azul claro')) return '#93c5fd';
    if (lower.includes('azul')) return '#2563eb';
    if (lower.includes('bordô') || lower.includes('vinho') || lower.includes('marsala')) return '#881337';
    if (lower.includes('vermelho')) return '#dc2626';
    if (lower.includes('chumbo') || lower.includes('grafite')) return '#334155';
    if (lower.includes('cinza claro')) return '#cbd5e1';
    if (lower.includes('cinza')) return '#64748b';
    if (lower.includes('branco') || lower.includes('branca')) return '#f8fafc';
    if (lower.includes('prata')) return '#e2e8f0';
    if (lower.includes('dourado') || lower.includes('mostarda')) return '#d97706';
    if (lower.includes('amarelo')) return '#eab308';
    if (lower.includes('marrom') || lower.includes('café')) return '#78350f';
    if (lower.includes('rosê') || lower.includes('rosa')) return '#f472b6';
    if (lower.includes('lilás')) return '#c084fc';
    if (lower.includes('oliva') || lower.includes('verde')) return '#4d7c0f';
    if (lower.includes('laranja')) return '#ea580c';
    return '#475569';
  }

  getColorBorderStyle(cor: string, isSelected: boolean = false): string {
    if (isSelected) {
      return 'border-2 border-indigo-400 bg-indigo-950/70 text-white ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/50';
    }
    return 'border border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80 hover:text-white';
  }

  async selectColorOption(color: string) {
    const field = this.activeColorPickerField();
    if (field) {
      this.trajeConfig.update(prev => ({ ...prev, [field]: color }));
      await this.salvarTrajeELideres();
      this.closeColorPicker();
      this.cdr.markForCheck();
    }
  }

  // --- Ações de Horários por Área ---
  getHorarioConfigurado(idArea: number, horarioTurno: number): {
    inicio: string;
    fim: string;
    exists: boolean;
    isSugerido: boolean;
    id?: number;
  } {
    // 1. Já salvo para este evento
    const found = this.operacaoService.areaHorarios().find(
      h => Number(h.id_area) === Number(idArea) && Number(h.horario_turno) === Number(horarioTurno)
    );
    if (found) {
      return {
        inicio: found.hora_inicio?.substring(0, 5) || '18:00',
        fim: found.hora_fim?.substring(0, 5) || '21:00',
        exists: true,
        isSugerido: false,
        id: found.id_area_horario
      };
    }

    // 2. Pré-preenchimento sugerido do último evento anterior
    const key = `${idArea}_${horarioTurno}`;
    const sugerido = this.operacaoService.horariosSugeridos()[key];
    if (sugerido && sugerido.hora_inicio && sugerido.hora_fim) {
      return {
        inicio: sugerido.hora_inicio.substring(0, 5),
        fim: sugerido.hora_fim.substring(0, 5),
        exists: false,
        isSugerido: true
      };
    }

    // 3. Padrão inteligente por turno
    const ev = this.operacaoService.evento();
    const isManha = ev?.turno === 1;
    if (isManha) {
      if (horarioTurno === 1) return { inicio: '08:30', fim: '10:00', exists: false, isSugerido: false };
      if (horarioTurno === 2) return { inicio: '10:00', fim: '11:30', exists: false, isSugerido: false };
      return { inicio: '08:30', fim: '11:30', exists: false, isSugerido: false };
    }

    if (horarioTurno === 1) return { inicio: '18:00', fim: '19:30', exists: false, isSugerido: false };
    if (horarioTurno === 2) return { inicio: '19:30', fim: '21:00', exists: false, isSugerido: false };
    return { inicio: '18:00', fim: '21:00', exists: false, isSugerido: false };
  }

  async salvarHorarioIndividual(idArea: number, horarioTurno: number, inicio: string, fim: string) {
    if (!this.authService.canManageOperacao() || !inicio || !fim) return;
    await this.operacaoService.saveAreaHorario(this.idEvento(), {
      id_area: idArea,
      horario_turno: horarioTurno,
      hora_inicio: inicio,
      hora_fim: fim
    });
    this.cdr.markForCheck();
  }

  async aplicarPredefinicaoGeral(tipo: 'noite_2turnos' | 'noite_integral' | 'manha_2turnos' | 'manha_integral' | 'quarta_noite') {
    if (!this.authService.canManageOperacao()) return;
    const areas = this.areasEvento();
    const turnos = this.turnosDisponiveis();
    const dtos: SaveAreaHorarioDto[] = [];

    for (const area of areas) {
      for (const t of turnos) {
        let inicio = '18:00';
        let fim = '21:00';

        if (tipo === 'noite_2turnos') {
          if (t.id === 1) { inicio = '18:00'; fim = '19:30'; }
          else if (t.id === 2) { inicio = '19:30'; fim = '21:00'; }
          else { inicio = '18:00'; fim = '21:00'; }
        } else if (tipo === 'noite_integral') {
          inicio = '18:00'; fim = '21:00';
        } else if (tipo === 'manha_2turnos') {
          if (t.id === 1) { inicio = '08:30'; fim = '10:00'; }
          else if (t.id === 2) { inicio = '10:00'; fim = '11:30'; }
          else { inicio = '08:30'; fim = '11:30'; }
        } else if (tipo === 'manha_integral') {
          inicio = '08:30'; fim = '11:30';
        } else if (tipo === 'quarta_noite') {
          if (t.id === 1) { inicio = '19:00'; fim = '20:15'; }
          else if (t.id === 2) { inicio = '20:15'; fim = '21:30'; }
          else { inicio = '19:00'; fim = '21:30'; }
        }

        dtos.push({
          id_area: area.id_area,
          horario_turno: t.id,
          hora_inicio: inicio,
          hora_fim: fim
        });
      }
    }

    await this.operacaoService.saveAreaHorariosBatch(this.idEvento(), dtos);
    this.cdr.markForCheck();
  }

  async copiarHorariosDoPrimeiroSetor() {
    if (!this.authService.canManageOperacao()) return;
    const horarios = this.operacaoService.areaHorarios();
    if (!horarios.length) {
      this.toast.warning('Atenção', 'Defina os horários de pelo menos um setor para poder replicar para os demais.');
      return;
    }
    const primeiroAreaId = horarios[0].id_area;
    const modelos = horarios.filter(h => h.id_area === primeiroAreaId);
    const outrasAreas = this.areasEvento().filter(a => a.id_area !== primeiroAreaId);
    
    const dtos: SaveAreaHorarioDto[] = [];
    for (const area of outrasAreas) {
      for (const mod of modelos) {
        dtos.push({
          id_area: area.id_area,
          horario_turno: mod.horario_turno,
          hora_inicio: mod.hora_inicio?.substring(0, 5) || '18:00',
          hora_fim: mod.hora_fim?.substring(0, 5) || '21:00'
        });
      }
    }

    if (dtos.length > 0) {
      await this.operacaoService.saveAreaHorariosBatch(this.idEvento(), dtos);
      this.cdr.markForCheck();
    }
  }

  async adicionarHorarioArea() {
    if (!this.novoHorario.id_area || !this.novoHorario.hora_inicio || !this.novoHorario.hora_fim) return;
    await this.operacaoService.saveAreaHorario(this.idEvento(), this.novoHorario);
    this.cdr.markForCheck();
  }

  async removerHorarioArea(horario: EventoAreaHorario) {
    if (horario.id_area_horario) {
      await this.operacaoService.deleteAreaHorario(horario.id_area_horario);
      this.cdr.markForCheck();
    }
  }

  opcoesHorariosSugeridos = computed(() => {
    const ev = this.operacaoService.evento();
    if (ev?.turno === 1) {
      return ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'];
    }
    if (ev?.turno === 2) {
      return ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
    }
    return ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
  });

  onTimeMask(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '');
    if (v.length > 4) v = v.substring(0, 4);

    let formatted = '';
    if (v.length <= 2) {
      formatted = v;
    } else {
      formatted = `${v.substring(0, 2)}:${v.substring(2)}`;
    }

    input.value = formatted;
  }

  // --- Seletor Modal / Bottom Sheet de Designação de Posto ---
  selectedEscalaForPicker = signal<Escala | null>(null);
  selectedTurnoForPicker = signal<number>(1);
  obreiroStatsAno = signal<ObreiroHistoricoAno | null>(null);
  loadingObreiroStats = signal<boolean>(false);

  async openPostoPicker(escala: Escala) {
    if (!this.authService.canManageOperacao()) return;
    this.selectedEscalaForPicker.set(escala);
    this.selectedTurnoForPicker.set(escala.horario_turno || 1);
    this.obreiroStatsAno.set(null);
    if (escala.id_obreiro) {
      await this.carregarHistoricoObreiro(escala.id_obreiro);
    }
  }

  async carregarHistoricoObreiro(idObreiro: number) {
    this.loadingObreiroStats.set(true);
    try {
      const ev = this.operacaoService.evento();
      const ano = ev?.mes?.ano_referencia || (ev?.data ? Number(ev.data.split('-')[0]) : new Date().getFullYear());

      const { data, error } = await this.supabase
        .from('escala')
        .select('id_local, horario_turno, mes!inner(ano_referencia)')
        .eq('id_obreiro', idObreiro)
        .eq('mes.ano_referencia', ano);

      if (error) throw error;

      const rows = data || [];
      const totalEscalasAno = rows.length;

      // 1. Contagem por Horário (1, 2, 3)
      const turnos = this.turnosDisponiveis();
      const horariosCount: { [turnoId: number]: number } = {};
      turnos.forEach(t => {
        horariosCount[t.id] = 0;
      });

      for (const r of rows) {
        const turno = Number(r.horario_turno ?? 1);
        if (horariosCount[turno] !== undefined) {
          horariosCount[turno]++;
        } else {
          horariosCount[turno] = 1;
        }
      }

      // Descobrir qual turno/horário teve menor atuação
      let menorTurnoId = turnos.length > 0 ? turnos[0].id : 1;
      let menorTurnoQtd = Infinity;
      turnos.forEach(t => {
        const qtd = horariosCount[t.id] ?? 0;
        if (qtd < menorTurnoQtd) {
          menorTurnoQtd = qtd;
          menorTurnoId = t.id;
        }
      });
      if (menorTurnoQtd === Infinity) menorTurnoQtd = 0;
      const horarioMenosAtuadoLabel = `${menorTurnoId}º Horário`;

      // 2. Contagem por Posto / Local ativo
      const obreiro = this.obreiroService.obreiros().find(o => o.id_obreiro === idObreiro) || this.selectedEscalaForPicker()?.obreiros;
      const isPulpito = !!obreiro?.pulpito;

      let locaisAtivos = this.localService.locais().filter(l => l.ativo);
      // Se não for do tipo púlpito, ignora locais chamados "Púlpito" na recomendação
      if (!isPulpito) {
        locaisAtivos = locaisAtivos.filter(l => {
          const nomeLower = (l.nome || '').toLowerCase();
          return !nomeLower.includes('púlpito') && !nomeLower.includes('pulpito') && l.id_local !== 3;
        });
      }

      const postosCount: { [idLocal: number]: number } = {};
      this.localService.locais().forEach(l => {
        if (l.id_local) postosCount[l.id_local] = 0;
      });

      for (const r of rows) {
        if (r.id_local && postosCount[r.id_local] !== undefined) {
          postosCount[r.id_local]++;
        }
      }

      // Descobrir qual local ativo elegível teve menor atuação no ano (inclui 0x)
      let menorLocalQtd = Infinity;
      locaisAtivos.forEach(l => {
        if (l.id_local) {
          const qtd = postosCount[l.id_local] ?? 0;
          if (qtd < menorLocalQtd) {
            menorLocalQtd = qtd;
          }
        }
      });
      if (menorLocalQtd === Infinity) menorLocalQtd = 0;

      const locaisMenosAtuados = locaisAtivos.filter(l => l.id_local && (postosCount[l.id_local] ?? 0) === menorLocalQtd);
      const locaisMenosAtuadosIds = locaisMenosAtuados.map(l => l.id_local!);
      const postoMenosAtuadoNome = locaisMenosAtuados.length > 0 ? locaisMenosAtuados[0].nome : 'Nenhum';

      this.obreiroStatsAno.set({
        ano,
        idObreiro,
        nomeObreiro: this.getObreiroNome(idObreiro),
        totalEscalasAno,
        horariosCount,
        horarioMenosAtuadoId: menorTurnoId,
        horarioMenosAtuadoLabel,
        horarioMenosAtuadoQtd: menorTurnoQtd,
        postosCount,
        postoMenosAtuadoNome,
        postoMenosAtuadoQtd: menorLocalQtd,
        locaisMenosAtuadosIds
      });
    } catch (err) {
      console.error('Erro ao carregar histórico anual do obreiro:', err);
    } finally {
      this.loadingObreiroStats.set(false);
      this.cdr.markForCheck();
    }
  }

  getObreiroHorarioCountNoAno(turnoId: number): number {
    const stats = this.obreiroStatsAno();
    if (!stats) return 0;
    return stats.horariosCount[turnoId] ?? 0;
  }

  isHorarioMenosAtuado(turnoId: number): boolean {
    const stats = this.obreiroStatsAno();
    if (!stats || stats.totalEscalasAno === 0) return false;
    return stats.horarioMenosAtuadoId === turnoId;
  }

  getObreiroPostoCountNoAno(idLocal: number): number {
    const stats = this.obreiroStatsAno();
    if (!stats) return 0;
    return stats.postosCount[idLocal] ?? 0;
  }

  isPostoMenosAtuado(idLocal: number): boolean {
    const stats = this.obreiroStatsAno();
    if (!stats) return false;
    return stats.locaisMenosAtuadosIds.includes(idLocal);
  }

  closePostoPicker() {
    this.selectedEscalaForPicker.set(null);
    this.obreiroStatsAno.set(null);
  }

  setPickerTurno(turnoId: number) {
    this.selectedTurnoForPicker.set(turnoId);
  }

  async selectPosto(local: Local) {
    const escala = this.selectedEscalaForPicker();
    const turno = this.selectedTurnoForPicker();
    if (escala?.id_escala && local?.id_local && turno) {
      await this.operacaoService.designarPosto(escala.id_escala, local.id_local, turno);
      this.closePostoPicker();
      this.cdr.markForCheck();
    }
  }

  async removerPostoModal() {
    const escala = this.selectedEscalaForPicker();
    if (escala?.id_escala) {
      await this.operacaoService.desvincularPosto(escala.id_escala);
      this.closePostoPicker();
      this.cdr.markForCheck();
    }
  }

  async desvincularPosto(escala: Escala) {
    if (escala.id_escala) {
      await this.operacaoService.desvincularPosto(escala.id_escala);
      this.cdr.markForCheck();
    }
  }

  // --- Novo Modo: Designar por Posto & Horário (Posto Primeiro) ---
  isPostoSelectorModalOpen = signal<boolean>(false);
  isObreiroForPostoModalOpen = signal<boolean>(false);
  selectedPostoPickerLocal = signal<Local | null>(null);
  selectedPostoPickerTurno = signal<number>(1);
  searchObreiroParaPosto = signal<string>('');
  filtroModalCandidatosStatus = signal<'TODOS' | 'PENDENTES' | 'ALOCADOS'>('TODOS');
  loadingPostoObreiros = signal<boolean>(false);
  obreirosStatsPorPosto = signal<Map<number, { escalasNoPosto: number; escalasNoTurno: number; totalAno: number }>>(new Map());

  openPostoFirstPicker() {
    if (!this.authService.canManageOperacao()) return;
    this.selectedPostoPickerTurno.set(1);
    this.isPostoSelectorModalOpen.set(true);
  }

  closePostoFirstPicker() {
    this.isPostoSelectorModalOpen.set(false);
  }

  async selectLocalETurnoParaDesignar(local: Local, turnoId?: number) {
    if (!this.authService.canManageOperacao()) return;
    const turno = turnoId || this.selectedPostoPickerTurno() || 1;
    this.selectedPostoPickerLocal.set(local);
    this.selectedPostoPickerTurno.set(turno);
    this.filtroModalCandidatosStatus.set('TODOS');
    this.isPostoSelectorModalOpen.set(false);
    this.isObreiroForPostoModalOpen.set(true);
    this.searchObreiroParaPosto.set('');
    await this.carregarEstatisticasParaPosto(local, turno);
  }

  closeObreiroForPostoModal() {
    this.isObreiroForPostoModalOpen.set(false);
    this.selectedPostoPickerLocal.set(null);
  }

  getObreirosAlocadosNoEventoParaPostoETurnoCount(idLocal?: number, turnoId?: number): number {
    if (!idLocal || !turnoId) return 0;
    return this.operacaoService.escalas()
      .filter(e => e.id_local === idLocal && Number(e.horario_turno) === turnoId)
      .length;
  }

  getEscalasDoLocalNoTurno(idLocal?: number, turnoId?: number): Escala[] {
    if (!idLocal || !turnoId) return [];
    return this.operacaoService.escalas()
      .filter(e => e.id_local === idLocal && Number(e.horario_turno) === turnoId);
  }

  getObreirosAlocadosNomesTexto(idLocal?: number, turnoId?: number): string {
    if (!idLocal || !turnoId) return '';
    const escalas = this.operacaoService.escalas()
      .filter(e => e.id_local === idLocal && Number(e.horario_turno) === turnoId && e.obreiros?.nome);
    return escalas.map(e => e.obreiros!.nome).join(', ');
  }

  async setPostoPickerTurnoAndRefresh(turnoId: number) {
    this.selectedPostoPickerTurno.set(turnoId);
    const local = this.selectedPostoPickerLocal();
    if (local) {
      await this.carregarEstatisticasParaPosto(local, turnoId);
    }
  }

  async carregarEstatisticasParaPosto(local: Local, turnoId: number) {
    this.loadingPostoObreiros.set(true);
    try {
      const ev = this.operacaoService.evento();
      const ano = ev?.mes?.ano_referencia || (ev?.data ? Number(ev.data.split('-')[0]) : new Date().getFullYear());
      const obreiroIds = this.operacaoService.escalas()
        .map(e => e.id_obreiro)
        .filter((id): id is number => typeof id === 'number' && id > 0);

      if (obreiroIds.length === 0) {
        this.obreirosStatsPorPosto.set(new Map());
        return;
      }

      const { data, error } = await this.supabase
        .from('escala')
        .select('id_obreiro, id_local, horario_turno, mes!inner(ano_referencia)')
        .in('id_obreiro', obreiroIds)
        .eq('mes.ano_referencia', ano);

      if (error) throw error;

      const map = new Map<number, { escalasNoPosto: number; escalasNoTurno: number; totalAno: number }>();
      obreiroIds.forEach(id => {
        map.set(id, { escalasNoPosto: 0, escalasNoTurno: 0, totalAno: 0 });
      });

      for (const row of (data || [])) {
        const id = row.id_obreiro;
        if (!map.has(id)) {
          map.set(id, { escalasNoPosto: 0, escalasNoTurno: 0, totalAno: 0 });
        }
        const stat = map.get(id)!;
        stat.totalAno++;
        if (row.id_local === local.id_local) {
          stat.escalasNoPosto++;
        }
        if (Number(row.horario_turno) === turnoId) {
          stat.escalasNoTurno++;
        }
      }

      this.obreirosStatsPorPosto.set(map);
    } catch (err) {
      console.error('Erro ao carregar estatísticas para o posto:', err);
    } finally {
      this.loadingPostoObreiros.set(false);
      this.cdr.markForCheck();
    }
  }

  getObreirosCandidatosParaPosto(): ObreiroPostoCandidate[] {
    const local = this.selectedPostoPickerLocal();
    const turnoId = this.selectedPostoPickerTurno();
    if (!local) return [];

    const isPulpitoPosto = (local.nome || '').toLowerCase().includes('púlpito') ||
      (local.nome || '').toLowerCase().includes('pulpito') ||
      local.id_local === 3;

    const statsMap = this.obreirosStatsPorPosto();
    const escalas = this.operacaoService.escalas();
    const search = this.searchObreiroParaPosto().trim().toLowerCase();

    // 1. Filtrar
    const filtered = escalas.filter(e => {
      if (!e.obreiros) return false;
      if (isPulpitoPosto && !e.obreiros.pulpito) return false;
      if (search && !e.obreiros.nome.toLowerCase().includes(search)) return false;
      return true;
    });

    // 2. Mapear candidatos
    const candidates: ObreiroPostoCandidate[] = filtered.map(e => {
      const stats = statsMap.get(e.id_obreiro) || { escalasNoPosto: 0, escalasNoTurno: 0, totalAno: 0 };
      const isPendente = !e.id_local;
      const postoAtual = this.localService.locais().find(l => l.id_local === e.id_local);

      return {
        escala: e,
        nome: e.obreiros?.nome || `Obreiro #${e.id_obreiro}`,
        isDiacono: !!e.obreiros?.diacono,
        isPulpito: !!e.obreiros?.pulpito,
        isLider: !!e.obreiros?.lider,
        isPendente,
        postoAtualNome: postoAtual?.nome,
        horarioAtualLabel: e.horario_turno ? `${e.horario_turno}º Horário` : undefined,
        escalasNoPostoAno: stats.escalasNoPosto,
        escalasNoTurnoAno: stats.escalasNoTurno,
        totalEscalasAno: stats.totalAno,
        isMenosAtuouNoPosto: false,
        isMenosAtuouNoTurno: false
      };
    });

    if (candidates.length === 0) return [];

    // 3. Identificar menor quantidade no posto e menor no turno
    const minPostoCount = Math.min(...candidates.map(c => c.escalasNoPostoAno));
    const minTurnoCount = Math.min(...candidates.map(c => c.escalasNoTurnoAno));

    candidates.forEach(c => {
      c.isMenosAtuouNoPosto = c.escalasNoPostoAno === minPostoCount;
      c.isMenosAtuouNoTurno = c.escalasNoTurnoAno === minTurnoCount;
    });

    // 4. Ordenação inteligente:
    // Prioridade 0: Se o posto NÃO é púlpito, diáconos de púlpito vão para o final
    // Prioridade 1: Pendentes primeiro (isPendente = true)
    // Prioridade 2: Menor atuação no posto no ano (escalasNoPostoAno crescente)
    // Prioridade 3: Menor atuação no horário no ano (escalasNoTurnoAno crescente)
    // Prioridade 4: Menor total no ano
    candidates.sort((a, b) => {
      if (!isPulpitoPosto) {
        if (!a.isPulpito && b.isPulpito) return -1;
        if (a.isPulpito && !b.isPulpito) return 1;
      }

      if (a.isPendente && !b.isPendente) return -1;
      if (!a.isPendente && b.isPendente) return 1;

      if (a.escalasNoPostoAno !== b.escalasNoPostoAno) {
        return a.escalasNoPostoAno - b.escalasNoPostoAno;
      }
      if (a.escalasNoTurnoAno !== b.escalasNoTurnoAno) {
        return a.escalasNoTurnoAno - b.escalasNoTurnoAno;
      }
      return a.totalEscalasAno - b.totalEscalasAno;
    });

    const statusFiltro = this.filtroModalCandidatosStatus();
    if (statusFiltro === 'PENDENTES') {
      return candidates.filter(c => c.isPendente);
    }
    if (statusFiltro === 'ALOCADOS') {
      return candidates.filter(c => !c.isPendente);
    }

    return candidates;
  }

  getCandidatosCounts(): { total: number; pendentes: number; alocados: number } {
    const local = this.selectedPostoPickerLocal();
    if (!local) return { total: 0, pendentes: 0, alocados: 0 };

    const isPulpitoPosto =
      (local.nome || '').toLowerCase().includes('pulpito') ||
      local.id_local === 3;

    const escalas = this.operacaoService.escalas();
    const search = this.searchObreiroParaPosto().trim().toLowerCase();

    const filtered = escalas.filter(e => {
      if (!e.obreiros) return false;
      if (isPulpitoPosto && !e.obreiros.pulpito) return false;
      if (search && !e.obreiros.nome.toLowerCase().includes(search)) return false;
      return true;
    });

    const pendentes = filtered.filter(e => !e.id_local).length;
    const alocados = filtered.filter(e => !!e.id_local).length;

    return {
      total: filtered.length,
      pendentes,
      alocados
    };
  }

  async designarObreiroParaPosto(escala: Escala) {
    const local = this.selectedPostoPickerLocal();
    const turno = this.selectedPostoPickerTurno();
    if (escala?.id_escala && local?.id_local && turno) {
      await this.operacaoService.designarPosto(escala.id_escala, local.id_local, turno);
      this.closeObreiroForPostoModal();
      this.cdr.markForCheck();
    }
  }

  getLocaisPorArea(idArea?: number): Local[] {
    const activeAreaIds = new Set(this.areasEvento().map(a => a.id_area));
    const list = this.localService.locais().filter(l => l.ativo && activeAreaIds.has(l.id_area));
    const filtered = idArea ? list.filter(l => l.id_area === idArea) : list;
    return filtered.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
  }

  getObreiroNome(idObreiro: number): string {
    const ob = this.obreiroService.obreiros().find(o => o.id_obreiro === idObreiro);
    return ob ? ob.nome : `Obreiro #${idObreiro}`;
  }

  // --- Compartilhamento WhatsApp ---
  openShareModal() {
    this.isShareModalOpen.set(true);
  }

  closeShareModal() {
    this.isShareModalOpen.set(false);
  }

  gerarTextoWhatsApp(): string {
    const ev = this.operacaoService.evento();
    if (!ev) return '';

    const lines: string[] = [];

    // Header
    lines.push(`📋 *DIACONATO - INFORMAÇÕES DO CULTO*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🏛️ *Culto:* ${ev.descricao || 'Culto / Evento'}`);
    if (ev.data) {
      lines.push(`📅 *Data:* ${this.formatDataEvento(ev.data)}`);
    }
    const turnoLabel = ev.turno === 1 ? '☀️ Manhã' : ev.turno === 2 ? '🌤️ Tarde' : '🌙 Noite';
    lines.push(`⏰ *Turno:* ${turnoLabel}`);
    lines.push('');

    // Liderança Responsável
    const lideresIds = this.trajeConfig().lideres_responsaveis_ids || [];
    const lideres = this.diaconosLideres().filter(l => typeof l.id_obreiro === 'number' && lideresIds.includes(l.id_obreiro));
    lines.push(`⭐ *Liderança Responsável:*`);
    if (lideres.length > 0) {
      lideres.forEach(l => lines.push(`  • ${l.nome}`));
    } else {
      lines.push(`  • Não definidos`);
    }
    lines.push('');

    // Traje Oficial
    lines.push(`👔 *Traje Oficial:*`);
    const cfg = this.trajeConfig();
    lines.push(`  • *Uniforme:* ${cfg.traje_tipo}`);
    if (cfg.traje_tipo === 'Terno') {
      lines.push(`  • *Terno:* ${cfg.terno_cor_obrigatoria ? cfg.terno_cor : 'Cor Livre'}`);
      lines.push(`  • *Gravata:* ${cfg.gravata_cor_obrigatoria ? cfg.gravata_cor : 'Cor Livre'}`);
      lines.push(`  • *Camisa:* ${cfg.camisa_cor_obrigatoria ? cfg.camisa_cor : 'Cor Livre'}`);
    }
    lines.push(`  • *Crachá:* ${cfg.cracha_obrigatorio ? 'Obrigatório' : 'Dispensado'}`);
    lines.push('');

    // Postos Agrupados por Área e dentro da Área por Horário
    lines.push(`📍 *ESCALA DE POSTOS POR ÁREA:*`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

    const allEscalas = this.operacaoService.escalas();
    const allAreas = this.areasEvento();
    const allTurnos = this.turnosDisponiveis();
    const horarios = this.operacaoService.areaHorarios();

    let temAlocados = false;

    for (const area of allAreas) {
      const escArea = allEscalas.filter(e => !!e.id_local && Number(e.locais?.id_area) === area.id_area);
      if (escArea.length === 0) continue;
      temAlocados = true;

      lines.push(`\n${area.icone || '📍'} *${area.nome.toUpperCase()}* (${escArea.length} alocados)`);

      // Dentro da Área, agrupar por Horário / Turno
      for (const turno of allTurnos) {
        const escTurno = escArea.filter(e => Number(e.horario_turno ?? 1) === turno.id);
        if (escTurno.length === 0) continue;

        const hArea = horarios.find((h: EventoAreaHorario) => h.id_area === area.id_area && h.horario_turno === turno.id);
        const horaTxt = hArea ? ` (${this.formatHoraAmPm(hArea.hora_inicio)} às ${this.formatHoraAmPm(hArea.hora_fim)})` : '';

        lines.push(`\n 🕒 *${turno.label}${horaTxt}*:`);

        // Agrupar por Posto / Local ordenados pela coluna ordem (locais.ordem)
        const locaisDaArea = this.getLocaisPorArea(area.id_area);
        const postosMap = new Map<string, string[]>();

        // 1. Inserir postos cadastrados na ordem oficial (ordem)
        for (const loc of locaisDaArea) {
          const escDoLocal = escTurno.filter(e => e.id_local === loc.id_local);
          if (escDoLocal.length > 0) {
            const obreiros = escDoLocal.map(e => e.obreiros?.nome || this.getObreiroNome(e.id_obreiro));
            postosMap.set(loc.nome, obreiros);
          }
        }

        // 2. Fallback para quaisquer escalas em locais não mapeados na área
        const locaisIdsCadastrados = new Set(locaisDaArea.map(l => l.id_local));
        const outrosLocais = escTurno.filter(e => !locaisIdsCadastrados.has(e.id_local || 0));
        for (const esc of outrosLocais) {
          const postoNome = esc.locais?.nome || 'Posto Geral';
          const obNome = esc.obreiros?.nome || this.getObreiroNome(esc.id_obreiro);
          const list = postosMap.get(postoNome) || [];
          list.push(obNome);
          postosMap.set(postoNome, list);
        }

        for (const [posto, obreiros] of postosMap.entries()) {
          lines.push(`  ▫️ ${posto}: ${obreiros.join(', ')}`);
        }
      }
    }

    if (!temAlocados) {
      lines.push(`\n_Nenhum obreiro alocado em postos até o momento._`);
    }

    // Obreiros Sem Posto (se houver)
    const semPosto = this.obreirosSemPosto();
    if (semPosto.length > 0) {
      lines.push(`\n⏳ *Obreiros sem posto definido (${semPosto.length}):*`);
      const nomes = semPosto.map(e => e.obreiros?.nome || this.getObreiroNome(e.id_obreiro));
      lines.push(` • ${nomes.join(', ')}`);
    }

    lines.push(`\n👥 *Total Geral Escalados:* ${this.totalEscalados()} obreiro(s)`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Que Deus abençoe!🙏`);

    return lines.join('\n');
  }

  async copiarTextoWhatsApp() {
    const texto = this.gerarTextoWhatsApp();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.toast.success('Copiado!', 'Mensagem copiada para a área de transferência.');
    } catch (err) {
      this.toast.error('Erro ao copiar', 'Não foi possível copiar automaticamente.');
    }
  }

  compartilharDiretoWhatsApp() {
    const texto = this.gerarTextoWhatsApp();
    const encoded = encodeURIComponent(texto);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  }

  voltar() {
    this.router.navigate(['/eventos']);
  }
}
