import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TipoEvento, CreateTipoEventoDto, DIAS_SEMANA_LABELS } from '../../core/models/tipo-evento.model';
import { TurnoEnum, TURNO_LABELS } from '../../core/models/turno.enum';
import { AreaService } from '../../core/services/area.service';

@Component({
  selector: 'app-tipo-evento-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tipo-evento-modal.component.html'
})
export class TipoEventoModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() tipoEvento: TipoEvento | null = null;
  @Input() loading = false;
  @Output() save = new EventEmitter<CreateTipoEventoDto>();
  @Output() close = new EventEmitter<void>();

  areaService = inject(AreaService);
  TurnoEnum = TurnoEnum;
  TURNO_LABELS = TURNO_LABELS;

  diasSemanaList = Object.entries(DIAS_SEMANA_LABELS).map(([val, name]) => ({
    value: Number(val),
    name
  }));

  private fb = inject(FormBuilder);
  form!: FormGroup;

  ngOnInit() {
    this.areaService.fetchAreas();
    this.initForm();
  }

  ngOnChanges() {
    this.initForm();
  }

  private initForm() {
    const initialAreas = this.tipoEvento?.areas_ids 
      ? [...this.tipoEvento.areas_ids] 
      : this.areaService.areas().filter(a => a.ativo).map(a => a.id_area);

    this.form = this.fb.group({
      descricao_padrao: [this.tipoEvento?.descricao_padrao || '', [Validators.required]],
      dia_semana_padrao: [this.tipoEvento?.dia_semana_padrao ?? null],
      turno_padrao: [this.tipoEvento?.turno_padrao || TurnoEnum.NOITE, [Validators.required]],
      n_primeiro_horario_padrao: [this.tipoEvento?.n_primeiro_horario_padrao ?? 2, [Validators.min(0)]],
      exclusivo_diacono_primeiro_padrao: [this.tipoEvento?.exclusivo_diacono_primeiro_padrao ?? false],
      pulpito_primeiro: [this.tipoEvento?.pulpito_primeiro ?? true],
      n_segundo_horario_padrao: [this.tipoEvento?.n_segundo_horario_padrao ?? 0, [Validators.min(0)]],
      exclusivo_diacono_segundo_padrao: [this.tipoEvento?.exclusivo_diacono_segundo_padrao ?? false],
      pulpito_segundo: [this.tipoEvento?.pulpito_segundo ?? true],
      n_terceiro_horario_padrao: [this.tipoEvento?.n_terceiro_horario_padrao ?? 0, [Validators.min(0)]],
      exclusivo_diacono_terceiro_padrao: [this.tipoEvento?.exclusivo_diacono_terceiro_padrao ?? false],
      pulpito_terceiro: [this.tipoEvento?.pulpito_terceiro ?? true],
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

  onSubmit() {
    if (this.form.valid) {
      const raw = this.form.value;
      this.save.emit({
        ...raw,
        dia_semana_padrao: raw.dia_semana_padrao ? Number(raw.dia_semana_padrao) : null,
        turno_padrao: Number(raw.turno_padrao),
        n_primeiro_horario_padrao: Number(raw.n_primeiro_horario_padrao || 0),
        n_segundo_horario_padrao: Number(raw.n_segundo_horario_padrao || 0),
        n_terceiro_horario_padrao: Number(raw.n_terceiro_horario_padrao || 0),
        areas_ids: raw.areas_ids || []
      });
    }
  }

  onCancel() {
    this.close.emit();
  }
}