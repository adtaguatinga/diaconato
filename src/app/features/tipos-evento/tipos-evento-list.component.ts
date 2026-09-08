import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TipoEventoService } from '../../core/services/tipo-evento.service';
import { TipoEvento, CreateTipoEventoDto, DIAS_SEMANA_LABELS } from '../../core/models/tipo-evento.model';
import { TURNO_LABELS, TURNO_COLORS } from '../../core/models/turno.enum';
import { TipoEventoModalComponent } from './tipo-evento-modal.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';
import { AreaService } from '../../core/services/area.service';

@Component({
  selector: 'app-tipos-evento-list',
  standalone: true,
  imports: [CommonModule, TipoEventoModalComponent, ConfirmModalComponent],
  templateUrl: './tipos-evento-list.component.html'
})
export class TiposEventoListComponent implements OnInit {
  tipoEventoService = inject(TipoEventoService);
  areaService = inject(AreaService);
  tiposEvento = this.tipoEventoService.tiposEvento;

  isModalOpen = false;
  isConfirmOpen = false;
  selectedTipoEvento: TipoEvento | null = null;

  ngOnInit() {
    this.tipoEventoService.fetchAll();
    this.areaService.fetchAreas();
  }

  getTurnoLabel(turno: number): string {
    return TURNO_LABELS[turno] || 'Geral';
  }

  getTurnoStyle(turno: number) {
    return TURNO_COLORS[turno] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  }

  getDiaSemanaLabel(dia: number): string {
    return DIAS_SEMANA_LABELS[dia] || '';
  }

  getTotalVagasPadrao(item: TipoEvento): number {
    return (item.n_primeiro_horario_padrao || 0) + (item.n_segundo_horario_padrao || 0) + (item.n_terceiro_horario_padrao || 0);
  }

  getAreasDoModelo(item: TipoEvento) {
    const ids = item.areas_ids || [];
    if (ids.length === 0) return [];
    return this.areaService.areas().filter(a => ids.includes(a.id_area));
  }

  openCreateModal() {
    this.selectedTipoEvento = null;
    this.isModalOpen = true;
  }

  openEditModal(item: TipoEvento) {
    this.selectedTipoEvento = item;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedTipoEvento = null;
  }

  openDeleteConfirm(item: TipoEvento) {
    this.selectedTipoEvento = item;
    this.isConfirmOpen = true;
  }

  closeConfirm() {
    this.isConfirmOpen = false;
    this.selectedTipoEvento = null;
  }

  async handleSave(dto: CreateTipoEventoDto) {
    if (this.selectedTipoEvento && this.selectedTipoEvento.id_tipo_evento) {
      const res = await this.tipoEventoService.update(this.selectedTipoEvento.id_tipo_evento, dto);
      if (res) this.closeModal();
    } else {
      const res = await this.tipoEventoService.create(dto);
      if (res) this.closeModal();
    }
  }

  async handleDelete() {
    if (this.selectedTipoEvento && this.selectedTipoEvento.id_tipo_evento) {
      const success = await this.tipoEventoService.delete(this.selectedTipoEvento.id_tipo_evento);
      if (success) this.closeConfirm();
    }
  }
}