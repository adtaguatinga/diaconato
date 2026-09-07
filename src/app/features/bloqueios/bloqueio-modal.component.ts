import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Bloqueio, CreateBloqueioDto } from '../../core/models/bloqueio.model';
import { Obreiro } from '../../core/models/obreiro.model';
import { MesService } from '../../core/services/mes.service';
import { Mes, formatMesReferencia, MESES_NOMES } from '../../core/models/mes.model';
import { TurnoEnum, TURNO_LABELS } from '../../core/models/turno.enum';
import { DIAS_SEMANA_LABELS } from '../../core/models/tipo-evento.model';
import { DIAS_SEMANA_OPCOES } from '../../core/models/padrao-bloqueio.model';

export type BloqueioTipoMode = 'especifico' | 'periodo' | 'par_impar' | 'dia_semana';

export interface BloqueioBatchPayload {
  id_obreiro: number;
  datas: string[]; // List of YYYY-MM-DD
  turnos: number[]; // List of turno numbers [1, 2, 3]
  motivo?: string | null;
}

@Component({
  selector: 'app-bloqueio-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bloqueio-modal.component.html'
})
export class BloqueioModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() bloqueio: Bloqueio | null = null;
  @Input() defaultObreiroId: number | null = null;
  @Input() defaultDate: string | null = null;
  @Input() obreiros: Obreiro[] = [];
  @Input() loading = false;
  @Output() save = new EventEmitter<BloqueioBatchPayload>();
  @Output() close = new EventEmitter<void>();

  mesService = inject(MesService);

  mode: BloqueioTipoMode = 'especifico';
  TurnoEnum = TurnoEnum;
  TURNO_LABELS = TURNO_LABELS;
  DIAS_SEMANA_OPCOES = DIAS_SEMANA_OPCOES;

  diasSemanaSelecionados: Set<number> = new Set(); // Inicialmente vazio

  diasSemanaList = Object.entries(DIAS_SEMANA_LABELS).map(([val, name]) => ({
    value: Number(val),
    name
  }));

  mesesList: { key: string; label: string; year: number; month: number }[] = [];

  private fb = inject(FormBuilder);
  form!: FormGroup;

  ngOnInit() {
    this.mesService.fetchAll();
    this.buildMesesList();
    this.initForm();
  }

  ngOnChanges() {
    this.buildMesesList();
    this.initForm();
  }

  private buildMesesList() {
    const list: { key: string; label: string; year: number; month: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // From mesService if exists
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

    // Default current & next months if empty
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

  setMode(newMode: BloqueioTipoMode) {
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
    const isEditing = !!this.bloqueio;
    const currentTurno = this.bloqueio?.turno;

    // Próximo mês ao atual por padrão (1º dia do próximo mês)
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextYear = nextMonth.getFullYear();
    const nextMonthNum = nextMonth.getMonth() + 1; // 1 a 12
    const defaultDateNextMonth = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-01`;
    const defaultMesKeyNextMonth = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`;

    this.mode = 'especifico';
    this.diasSemanaSelecionados = new Set(); // Inicialmente nenhum dia da semana selecionado

    // Procurar mês correspondente na lista de meses cadastrados ou usar a chave calculada
    const matchingMes = this.mesesList.find(m => m.key === defaultMesKeyNextMonth);
    const initialMesRef = matchingMes ? matchingMes.key : (this.mesesList[0]?.key || defaultMesKeyNextMonth);

    const initialDate = this.bloqueio?.data || this.defaultDate || defaultDateNextMonth;

    this.form = this.fb.group({
      id_obreiro: [this.bloqueio?.id_obreiro || this.defaultObreiroId || null, [Validators.required]],
      data: [initialDate, [Validators.required]],
      data_inicio: [initialDate, [Validators.required]],
      data_fim: [initialDate, [Validators.required]],
      mes_ref: [initialMesRef],
      paridade: ['pares'],
      manha: [isEditing ? (currentTurno === TurnoEnum.MANHA || currentTurno === TurnoEnum.INTEGRAL) : true],
      tarde: [isEditing ? (currentTurno === TurnoEnum.TARDE || currentTurno === TurnoEnum.INTEGRAL) : true],
      noite: [isEditing ? (currentTurno === TurnoEnum.NOITE || currentTurno === TurnoEnum.INTEGRAL) : true],
      motivo: [this.bloqueio?.motivo || '']
    });
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
      const month = Number(monthStr); // 1..12
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
        // JS getDay() is 0 (Sunday) to 6 (Saturday), our mapping is 1 (Sunday) to 7 (Saturday)
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
    if (this.isTodosTurnosSelecionados()) return 1; // Todos os turnos geram 1 único bloqueio (Dia Inteiro)
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

  onSubmit() {
    if (this.form.valid && this.hasSelectedTurno() && this.calculatedDates.length > 0) {
      const raw = this.form.value;
      const turnos: number[] = [];
      
      if (raw.manha && raw.tarde && raw.noite) {
        // Quando todos os turnos forem selecionados, gera apenas 1 bloqueio de Dia Inteiro (Integral)
        turnos.push(TurnoEnum.INTEGRAL);
      } else {
        if (raw.manha) turnos.push(TurnoEnum.MANHA);
        if (raw.tarde) turnos.push(TurnoEnum.TARDE);
        if (raw.noite) turnos.push(TurnoEnum.NOITE);
      }

      this.save.emit({
        id_obreiro: Number(raw.id_obreiro),
        datas: this.calculatedDates,
        turnos,
        motivo: raw.motivo || null
      });
    }
  }

  onCancel() {
    this.close.emit();
  }
}