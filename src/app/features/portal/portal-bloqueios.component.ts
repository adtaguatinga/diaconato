import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ObreiroAuthService } from '../../core/services/obreiro-auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ToastService } from '../../core/services/toast.service';
import { MesService } from '../../core/services/mes.service';
import { Bloqueio } from '../../core/models/bloqueio.model';
import { formatMesReferencia, MESES_NOMES } from '../../core/models/mes.model';
import { TurnoEnum, TURNO_LABELS } from '../../core/models/turno.enum';
import { DIAS_SEMANA_LABELS } from '../../core/models/tipo-evento.model';
import { DIAS_SEMANA_OPCOES } from '../../core/models/padrao-bloqueio.model';

export type AusenciaTipoMode = 'especifico' | 'periodo' | 'par_impar' | 'dia_semana';

export interface AusenciaDiaGrupo {
  data: string;
  isFuturo: boolean;
  bloqueios: Bloqueio[];
  ids: number[];
  turnos: number[];
  motivo?: string | null;
  isDiaTodo: boolean;
}

export interface ConfirmacaoModalData {
  titulo: string;
  mensagem: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

@Component({
  selector: 'app-portal-bloqueios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './portal-bloqueios.component.html'
})
export class PortalBloqueiosComponent implements OnInit {
  public obreiroAuth = inject(ObreiroAuthService);
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private mesService = inject(MesService);
  private fb = inject(FormBuilder);

  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  deleting = signal<boolean>(false);
  bloqueios = signal<Bloqueio[]>([]);
  isModalAddOpen = signal<boolean>(false);
  isConfirmModalOpen = signal<boolean>(false);
  confirmData = signal<ConfirmacaoModalData | null>(null);

  mode: AusenciaTipoMode = 'especifico';
  TurnoEnum = TurnoEnum;
  TURNO_LABELS = TURNO_LABELS;
  DIAS_SEMANA_OPCOES = DIAS_SEMANA_OPCOES;

  diasSemanaSelecionados: Set<number> = new Set(); // Inicialmente vazio

  diasSemanaList = Object.entries(DIAS_SEMANA_LABELS).map(([val, name]) => ({
    value: Number(val),
    name
  }));

  mesesList: { key: string; label: string; year: number; month: number }[] = [];

  form!: FormGroup;
  hojeStr = new Date().toISOString().split('T')[0];

  bloqueiosFuturos = computed(() => {
    return this.bloqueios().filter(b => b.data >= this.hojeStr);
  });

  bloqueiosPassados = computed(() => {
    return this.bloqueios().filter(b => b.data < this.hojeStr);
  });

  ausenciasFuturasAgrupadas = computed<AusenciaDiaGrupo[]>(() => {
    return this.agruparPorDia(this.bloqueiosFuturos());
  });

  ausenciasPassadasAgrupadas = computed<AusenciaDiaGrupo[]>(() => {
    return this.agruparPorDia(this.bloqueiosPassados());
  });

  ngOnInit(): void {
    this.mesService.fetchAll();
    this.buildMesesList();
    this.initForm();
    this.carregarBloqueios();
  }

  private agruparPorDia(lista: Bloqueio[]): AusenciaDiaGrupo[] {
    const map = new Map<string, Bloqueio[]>();
    for (const b of lista) {
      if (!map.has(b.data)) {
        map.set(b.data, []);
      }
      map.get(b.data)!.push(b);
    }

    const grupos: AusenciaDiaGrupo[] = [];
    for (const [data, items] of map.entries()) {
      const ids = items.map(i => i.id_bloqueio!).filter(Boolean);
      const turnos = items.map(i => i.turno).sort();
      const isDiaTodo = [1, 2, 3].every(t => turnos.includes(t)) || turnos.includes(4);
      const motivo = items.find(i => i.motivo)?.motivo || null;
      grupos.push({
        data,
        isFuturo: data >= this.hojeStr,
        bloqueios: items,
        ids,
        turnos,
        motivo,
        isDiaTodo
      });
    }

    return grupos.sort((a, b) => a.data.localeCompare(b.data));
  }

  private buildMesesList() {
    const list: { key: string; label: string; year: number; month: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const m of this.mesService.meses()) {
      const key = `${m.ano_referencia}-${String(m.mes_referencia).padStart(2, '0')}`;
      if (!list.some(item => item.key === key)) {
        list.push({
          key,
          label: formatMesReferencia(m),
          year: m.ano_referencia,
          month: m.mes_referencia
        });
      }
    }

    if (list.length === 0) {
      for (let y of [currentYear, currentYear + 1]) {
        for (let m = 1; m <= 12; m++) {
          list.push({
            key: `${y}-${String(m).padStart(2, '0')}`,
            label: `${MESES_NOMES[m]}/${y}`,
            year: y,
            month: m
          });
        }
      }
    }

    this.mesesList = list;
  }

  setMode(newMode: AusenciaTipoMode) {
    this.mode = newMode;
  }

  toggleDiaSemana(dia: number) {
    const next = new Set(this.diasSemanaSelecionados);
    if (next.has(dia)) {
      next.delete(dia);
    } else {
      next.add(dia);
    }
    this.diasSemanaSelecionados = next;
  }

  selecionarAtalhoDias(atalho: 'todos' | 'uteis' | 'fim_semana' | 'domingos') {
    switch (atalho) {
      case 'todos':
        this.diasSemanaSelecionados = new Set([1, 2, 3, 4, 5, 6, 7]);
        break;
      case 'uteis':
        this.diasSemanaSelecionados = new Set([2, 3, 4, 5, 6]);
        break;
      case 'fim_semana':
        this.diasSemanaSelecionados = new Set([1, 7]);
        break;
      case 'domingos':
        this.diasSemanaSelecionados = new Set([1]);
        break;
    }
  }

  private initForm() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextYear = nextMonth.getFullYear();
    const nextMonthNum = nextMonth.getMonth() + 1;
    const defaultDateNextMonth = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-01`;
    const defaultMesKeyNextMonth = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`;

    const matchingMes = this.mesesList.find(m => m.key === defaultMesKeyNextMonth);
    const initialMesRef = matchingMes ? matchingMes.key : (this.mesesList[0]?.key || defaultMesKeyNextMonth);
    const initialDate = this.hojeStr;

    this.diasSemanaSelecionados = new Set(); // Inicialmente nenhum dia da semana selecionado

    this.form = this.fb.group({
      data: [initialDate, [Validators.required]],
      data_inicio: [initialDate, [Validators.required]],
      data_fim: [initialDate, [Validators.required]],
      mes_ref: [initialMesRef],
      paridade: ['pares'],
      manha: [true],
      tarde: [true],
      noite: [true],
      motivo: ['']
    });
  }

  async carregarBloqueios(): Promise<void> {
    const obreiro = this.obreiroAuth.currentObreiro();
    if (!obreiro?.id_obreiro) return;

    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('bloqueios')
        .select('*')
        .eq('id_obreiro', obreiro.id_obreiro)
        .order('data', { ascending: true });

      if (!error && data) {
        this.bloqueios.set(data as Bloqueio[]);
      }
    } catch (e) {
      console.error('Erro ao carregar ausências do portal:', e);
    } finally {
      this.loading.set(false);
    }
  }

  openAddModal(): void {
    this.buildMesesList();
    this.initForm();
    this.mode = 'especifico';
    this.isModalAddOpen.set(true);
  }

  closeAddModal(): void {
    this.isModalAddOpen.set(false);
  }

  get calculatedDates(): string[] {
    if (!this.form) return [];
    const raw = this.form.value;

    if (this.mode === 'especifico') {
      return raw.data ? [raw.data] : [];
    }

    if (this.mode === 'periodo') {
      if (!raw.data_inicio || !raw.data_fim) return [];
      const start = new Date(raw.data_inicio + 'T00:00:00');
      const end = new Date(raw.data_fim + 'T00:00:00');
      if (start > end) return [];

      const list: string[] = [];
      let cur = new Date(start);
      while (cur <= end) {
        list.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
      return list;
    }

    if (this.mode === 'par_impar') {
      const mesKey = raw.mes_ref;
      if (!mesKey) return [];
      const [yearStr, monthStr] = mesKey.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const totalDays = new Date(year, month, 0).getDate();
      const isPares = raw.paridade === 'pares';

      const list: string[] = [];
      for (let day = 1; day <= totalDays; day++) {
        const match = isPares ? (day % 2 === 0) : (day % 2 !== 0);
        if (match) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          list.push(dateStr);
        }
      }
      return list;
    }

    if (this.mode === 'dia_semana') {
      const mesKey = raw.mes_ref;
      if (!mesKey || this.diasSemanaSelecionados.size === 0) return [];
      const [yearStr, monthStr] = mesKey.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const totalDays = new Date(year, month, 0).getDate();

      const list: string[] = [];
      for (let day = 1; day <= totalDays; day++) {
        const d = new Date(year, month - 1, day);
        const currentDayOfWeek = d.getDay() + 1;
        if (this.diasSemanaSelecionados.has(currentDayOfWeek)) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          list.push(dateStr);
        }
      }
      return list;
    }

    return [];
  }

  hasSelectedTurno(): boolean {
    if (!this.form) return false;
    return !!(this.form.get('manha')?.value || this.form.get('tarde')?.value || this.form.get('noite')?.value);
  }

  isTodosTurnosSelecionados(): boolean {
    if (!this.form) return false;
    return !!(this.form.get('manha')?.value && this.form.get('tarde')?.value && this.form.get('noite')?.value);
  }

  getSelectedTurnosCount(): number {
    if (!this.form) return 0;
    if (this.isTodosTurnosSelecionados()) return 1;
    let count = 0;
    if (this.form.get('manha')?.value) count++;
    if (this.form.get('tarde')?.value) count++;
    if (this.form.get('noite')?.value) count++;
    return count;
  }

  selectAllTurnos(selected: boolean) {
    this.form.patchValue({
      manha: selected,
      tarde: selected,
      noite: selected
    });
  }

  getDatesPreview(): string {
    const dates = this.calculatedDates;
    if (dates.length === 0) return 'Nenhuma data';
    const formatted = dates.map(d => {
      const [y, m, day] = d.split('-');
      return `${day}/${m}`;
    });
    if (formatted.length <= 6) return formatted.join(', ');
    return `${formatted.slice(0, 6).join(', ')} e mais ${formatted.length - 6} data(s)...`;
  }

  async salvarBloqueio(): Promise<void> {
    if (this.form.invalid || !this.hasSelectedTurno() || this.calculatedDates.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const obreiro = this.obreiroAuth.currentObreiro();
    if (!obreiro?.id_obreiro) return;

    const raw = this.form.value;
    const dates = this.calculatedDates;
    const turnos: number[] = [];
    if (raw.manha && raw.tarde && raw.noite) {
      turnos.push(TurnoEnum.INTEGRAL);
    } else {
      if (raw.manha) turnos.push(TurnoEnum.MANHA);
      if (raw.tarde) turnos.push(TurnoEnum.TARDE);
      if (raw.noite) turnos.push(TurnoEnum.NOITE);
    }

    const motivoFormatado = raw.motivo?.trim() || null;

    this.saving.set(true);
    try {
      const registrosParaInserir: any[] = [];

      for (const d of dates) {
        for (const t of turnos) {
          registrosParaInserir.push({
            id_obreiro: obreiro.id_obreiro,
            data: d,
            turno: t,
            motivo: motivoFormatado
          });
        }
      }

      const { error } = await this.supabase
        .from('bloqueios')
        .insert(registrosParaInserir);

      if (error) throw error;

      this.toast.success('Ausência Registrada', `${registrosParaInserir.length} registro(s) de ausência salvo(s) com sucesso!`);
      this.closeAddModal();
      await this.carregarBloqueios();
    } catch (err: any) {
      console.error('Erro ao cadastrar ausência:', err);
      this.toast.error('Erro ao Salvar', err.message || 'Não foi possível cadastrar a ausência.');
    } finally {
      this.saving.set(false);
    }
  }

  // Abertura do Modal Customizado de Confirmação para Remoção de Dia
  solicitarRemoverDia(grupo: AusenciaDiaGrupo): void {
    if (!grupo.ids.length) return;
    const dataFormatada = this.formatDataExtensa(grupo.data);

    this.confirmData.set({
      titulo: 'Remover Ausências do Dia?',
      mensagem: `Deseja realmente remover todas as ausências cadastradas para ${dataFormatada}? Sua disponibilidade voltará a ficar ativa para escalas nesta data.`,
      confirmLabel: 'Sim, Remover Ausências',
      onConfirm: async () => {
        const { error } = await this.supabase
          .from('bloqueios')
          .delete()
          .in('id_bloqueio', grupo.ids);

        if (error) throw error;
        this.toast.success('Ausências Removidas', `As ausências do dia ${dataFormatada} foram excluídas com sucesso.`);
        await this.carregarBloqueios();
      }
    });

    this.isConfirmModalOpen.set(true);
  }

  // Abertura do Modal Customizado de Confirmação para Remoção de Turno
  solicitarRemoverTurno(idBloqueio: number, turnoLabel: string, dataStr: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const dataFormatada = this.formatDataExtensa(dataStr);

    this.confirmData.set({
      titulo: 'Remover Turno de Ausência?',
      mensagem: `Deseja remover a ausência do turno ${turnoLabel} no dia ${dataFormatada}? Os demais turnos desta data permanecerão bloqueados.`,
      confirmLabel: 'Sim, Remover Turno',
      onConfirm: async () => {
        const { error } = await this.supabase
          .from('bloqueios')
          .delete()
          .eq('id_bloqueio', idBloqueio);

        if (error) throw error;
        this.toast.success('Turno Removido', 'A ausência deste turno foi excluída com sucesso.');
        await this.carregarBloqueios();
      }
    });

    this.isConfirmModalOpen.set(true);
  }

  async confirmarAcao(): Promise<void> {
    const data = this.confirmData();
    if (!data) return;

    this.deleting.set(true);
    try {
      await data.onConfirm();
      this.closeConfirmModal();
    } catch (err: any) {
      console.error('Erro ao executar remoção:', err);
      this.toast.error('Erro ao Excluir', 'Não foi possível concluir a exclusão.');
    } finally {
      this.deleting.set(false);
    }
  }

  closeConfirmModal(): void {
    this.isConfirmModalOpen.set(false);
    this.confirmData.set(null);
  }

  formatDataExtensa(dataStr?: string): string {
    if (!dataStr) return '';
    try {
      const parts = dataStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${dias[d.getDay()]}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (_) {}
    return dataStr;
  }

  getTurnoBadge(turno?: number): { label: string; class: string } {
    if (turno === 1) return { label: '☀️ Manhã', class: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    if (turno === 2) return { label: '🌤️ Tarde', class: 'bg-orange-500/10 text-orange-300 border-orange-500/30' };
    if (turno === 3) return { label: '🌙 Noite', class: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' };
    return { label: '📅 Dia Todo', class: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
  }
}
