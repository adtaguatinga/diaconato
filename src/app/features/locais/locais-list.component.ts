import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalService } from '../../core/services/local.service';
import { AreaService } from '../../core/services/area.service';
import { AuthService } from '../../core/services/auth.service';
import { Local, CreateLocalDto, getAreaStyle } from '../../core/models/local.model';
import { Area } from '../../core/models/area.model';
import { LocalModalComponent } from './local-modal.component';
import { AreaMapaModalComponent } from './area-mapa-modal.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

export interface AreaGroup {
  area: Area;
  locais: Local[];
  totalAtivos: number;
}

@Component({
  selector: 'app-locais-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LocalModalComponent, AreaMapaModalComponent, ConfirmModalComponent],
  templateUrl: './locais-list.component.html'
})
export class LocaisListComponent implements OnInit {
  localService = inject(LocalService);
  areaService = inject(AreaService);
  authService = inject(AuthService);

  getAreaStyle = getAreaStyle;
  searchQuery = signal<string>('');
  selectedAreaFilter = signal<number | 'TODAS'>('TODAS');
  viewMode: 'agrupado' | 'cards' = 'agrupado';

  isModalOpen = false;
  isConfirmOpen = false;
  isMapaModalOpen = false;
  selectedLocal: Local | null = null;
  selectedAreaForMapa: Area | null = null;
  defaultAreaId: number | null = null;

  // Estatísticas
  totalCount = computed(() => this.localService.locais().length);
  activeCount = computed(() => this.localService.locais().filter(l => l.ativo).length);
  areasCount = computed(() => this.areaService.areas().length);

  // Lista Filtrada
  filteredLocais = computed(() => {
    let list = this.localService.locais();
    const query = this.searchQuery().toLowerCase().trim();
    const areaId = this.selectedAreaFilter();

    if (areaId !== 'TODAS') {
      list = list.filter(l => l.id_area === areaId);
    }

    if (query) {
      list = list.filter(l => 
        l.nome.toLowerCase().includes(query) ||
        (l.descricao && l.descricao.toLowerCase().includes(query)) ||
        (l.areas?.nome && l.areas.nome.toLowerCase().includes(query))
      );
    }

    return list;
  });

  // Agrupado por Área
  groupedLocais = computed<AreaGroup[]>(() => {
    const list = this.filteredLocais();
    const allAreas = this.areaService.areas();
    const groups: AreaGroup[] = [];

    allAreas.forEach(area => {
      const locaisDaArea = list
        .filter(l => l.id_area === area.id_area)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));

      if (locaisDaArea.length > 0 || this.selectedAreaFilter() === 'TODAS') {
        groups.push({
          area,
          locais: locaisDaArea,
          totalAtivos: locaisDaArea.filter(i => i.ativo).length
        });
      }
    });

    return groups;
  });

  ngOnInit() {
    this.localService.fetchLocais();
    this.areaService.fetchAreas();
  }

  openCreateModal(defaultAreaId?: number) {
    this.selectedLocal = null;
    this.defaultAreaId = defaultAreaId || null;
    this.isModalOpen = true;
  }

  openEditModal(local: Local) {
    this.selectedLocal = local;
    this.defaultAreaId = local.id_area;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedLocal = null;
    this.defaultAreaId = null;
  }

  async handleSave(dto: CreateLocalDto) {
    if (this.selectedLocal) {
      await this.localService.updateLocal(this.selectedLocal.id_local, dto);
    } else {
      await this.localService.createLocal(dto);
    }
    this.closeModal();
  }

  openDeleteConfirm(local: Local) {
    this.selectedLocal = local;
    this.isConfirmOpen = true;
  }

  closeConfirm() {
    this.isConfirmOpen = false;
    this.selectedLocal = null;
  }

  async handleDelete() {
    if (this.selectedLocal) {
      await this.localService.deleteLocal(this.selectedLocal.id_local);
      this.closeConfirm();
    }
  }

  async toggleAtivo(local: Local) {
    await this.localService.toggleAtivo(local);
  }

  openMapaModal(area: Area) {
    this.selectedAreaForMapa = area;
    this.isMapaModalOpen = true;
  }

  getLocaisDaArea(idArea: number): Local[] {
    return this.localService.locais().filter(l => l.id_area === idArea);
  }
}
