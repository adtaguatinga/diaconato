import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Evento, CreateEventoDto } from '../../core/models/evento.model';
import { Mes, formatMesReferencia } from '../../core/models/mes.model';
import { TipoEventoService } from '../../core/services/tipo-evento.service';
import { MesService } from '../../core/services/mes.service';
import { AreaService } from '../../core/services/area.service';
import { TurnoEnum, TURNO_LABELS } from '../../core/models/turno.enum';

@Component({
  selector: 'app-evento-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './evento-modal.component.html'
})
export class EventoModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() evento: Evento | null = null;
  @Input() defaultMesId: number | null = null;
  @Input() loading = false;
  @Output() save = new EventEmitter<CreateEventoDto>();
  @Output() close = new EventEmitter<void>();

  tipoEventoService = inject(TipoEventoService);
  mesService = inject(MesService);
  areaService = inject(AreaService);

  formatMesReferencia = formatMesReferencia;
  TurnoEnum = TurnoEnum;
  TURNO_LABELS = TURNO_LABELS;

  private fb = inject(FormBuilder);
  form!: FormGroup;

  ngOnInit() {
    this.tipoEventoService.fetchAll();
    this.mesService.fetchAll();
    this.areaService.fetchAreas();
    this.initForm();
  }

  ngOnChanges() {
    this.initForm();
  }

  private getDefaultDateForMes(idMes: number | null): string {
    if (!idMes) return new Date().toISOString().split('T')[0];
    const mes = this.mesService.meses().find(m => m.id_mes === idMes);
    if (!mes) return new Date().toISOString().split('T')[0];

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-indexed (1-12)

    // Se o mês de referência for exatamente o mês e ano atual, preencher com a data de hoje
    if (mes.ano_referencia === currentYear && mes.mes_referencia === currentMonth) {
      return today.toISOString().split('T')[0];
    }

    // Caso contrário, preencher por padrão com o 1º dia do mês de referência (YYYY-MM-01)
    const mm = String(mes.mes_referencia).padStart(2, '0');
    return `${mes.ano_referencia}-${mm}-01`;
  }

  private initForm() {
    const initialMesId = this.evento?.id_mes || this.defaultMesId || this.mesService.meses()[0]?.id_mes || null;
    const defaultDate = this.evento?.data || this.getDefaultDateForMes(initialMesId);
    const initialAreas = this.evento?.areas_ids 
      ? [...this.evento.areas_ids] 
      : this.areaService.areas().filter(a => a.ativo).map(a => a.id_area);

    this.form = this.fb.group({
      id_mes: [initialMesId, [Validators.required]],
      descricao: [this.evento?.descricao || '', [Validators.required]],
      data: [defaultDate, [Validators.required]],
      turno: [this.evento?.turno || TurnoEnum.NOITE, [Validators.required]],
      n_primeiro_horario: [this.evento?.n_primeiro_horario ?? 2, [Validators.min(0)]],
      exclusivo_diacono_primeiro: [this.evento?.exclusivo_diacono_primeiro ?? false],
      pulpito_primeiro: [this.evento?.pulpito_primeiro ?? true],
      n_segundo_horario: [this.evento?.n_segundo_horario ?? 0, [Validators.min(0)]],
      exclusivo_diacono_segundo: [this.evento?.exclusivo_diacono_segundo ?? false],
      pulpito_segundo: [this.evento?.pulpito_segundo ?? true],
      n_terceiro_horario: [this.evento?.n_terceiro_horario ?? 0, [Validators.min(0)]],
      exclusivo_diacono_terceiro: [this.evento?.exclusivo_diacono_terceiro ?? false],
      pulpito_terceiro: [this.evento?.pulpito_terceiro ?? true],
      areas_ids: [initialAreas]
    });
  }

  isAreaSelected(idArea: number): boolean {
    const list: number[] = this.form?.get('areas_ids')?.value || [];
    return list.includes(idArea);
  }

  toggleArea(idArea: number) {
    const current: number[] = [...(this.form?.get('areas_ids')?.value || [])];
    const index = current.indexOf(idArea);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(idArea);
    }
    this.form.patchValue({ areas_ids: current });
  }

  onMesChange(event: any) {
    const newMesId = Number(event.target.value);
    if (newMesId && !this.evento) {
      const newDate = this.getDefaultDateForMes(newMesId);
      this.form.patchValue({ data: newDate });
    }
  }

  findMatchingMesId(dateStr: string): number | null {
    if (!dateStr) return this.mesService.meses()[0]?.id_mes ?? null;
    const [year, month] = dateStr.split('-').map(Number);
    const found = this.mesService.meses().find(m => m.ano_referencia === year && m.mes_referencia === month);
    return found?.id_mes || this.mesService.meses()[0]?.id_mes || null;
  }

  onDateChange(event: any) {
    const dateStr = event.target.value;
    if (dateStr && !this.form.get('id_mes')?.value) {
      const matchId = this.findMatchingMesId(dateStr);
      if (matchId) {
        this.form.patchValue({ id_mes: matchId });
      }
    }
  }

  applyTemplate(event: any) {
    const templateId = Number(event.target.value);
    if (!templateId) return;

    const template = this.tipoEventoService.tiposEvento().find(t => t.id_tipo_evento === templateId);
    if (!template) return;

    this.form.patchValue({
      descricao: template.descricao_padrao,
      turno: template.turno_padrao,
      n_primeiro_horario: template.n_primeiro_horario_padrao,
      exclusivo_diacono_primeiro: template.exclusivo_diacono_primeiro_padrao,
      pulpito_primeiro: template.pulpito_primeiro ?? true,
      n_segundo_horario: template.n_segundo_horario_padrao,
      exclusivo_diacono_segundo: template.exclusivo_diacono_segundo_padrao,
      pulpito_segundo: template.pulpito_segundo ?? true,
      n_terceiro_horario: template.n_terceiro_horario_padrao,
      exclusivo_diacono_terceiro: template.exclusivo_diacono_terceiro_padrao,
      pulpito_terceiro: template.pulpito_terceiro ?? true,
      areas_ids: template.areas_ids && template.areas_ids.length > 0
        ? [...template.areas_ids]
        : this.areaService.areas().filter(a => a.ativo).map(a => a.id_area)
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const raw = this.form.value;
      this.save.emit({
        ...raw,
        id_mes: Number(raw.id_mes),
        turno: Number(raw.turno),
        n_primeiro_horario: Number(raw.n_primeiro_horario || 0),
        n_segundo_horario: Number(raw.n_segundo_horario || 0),
        n_terceiro_horario: Number(raw.n_terceiro_horario || 0),
        areas_ids: raw.areas_ids || []
      });
    }
  }

  onCancel() {
    this.close.emit();
  }
}