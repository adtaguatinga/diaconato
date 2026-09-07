import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BloqueioService } from '../../core/services/bloqueio.service';
import { ObreiroService } from '../../core/services/obreiro.service';
import { MesService } from '../../core/services/mes.service';
import { PadraoBloqueioService } from '../../core/services/padrao-bloqueio.service';
import { AuthService } from '../../core/services/auth.service';
import { Bloqueio, CreateBloqueioDto } from '../../core/models/bloqueio.model';
import { Obreiro } from '../../core/models/obreiro.model';
import { formatMesReferencia, findCurrentMes } from '../../core/models/mes.model';
import { TURNO_LABELS, TURNO_COLORS, TurnoEnum } from '../../core/models/turno.enum';
import { BloqueioModalComponent, BloqueioBatchPayload } from './bloqueio-modal.component';
import { GeradorBloqueiosModalComponent } from './gerador-bloqueios-modal.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

export interface ObreiroBloqueioGroup {
  obreiro: Obreiro | { id_obreiro: number; nome: string; apelido?: string; diacono?: boolean; lider?: boolean; pulpito?: boolean };
  bloqueios: Bloqueio[];
}

export interface DiaBloqueioGroup {
  data: string; // 'YYYY-MM-DD'
  dateObj: Date;
  dataFormatada: string;
  diaSemana: string;
  bloqueios: Bloqueio[];
  turnosCount: {
    manha: number;
    tarde: number;
    noite: number;
    integral: number;
  };
}

@Component({
  selector: 'app-bloqueios-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    BloqueioModalComponent, 
    GeradorBloqueiosModalComponent,
    ConfirmModalComponent
  ],
  templateUrl: './bloqueios-list.component.html'
})
export class BloqueiosListComponent implements OnInit {
  authService = inject(AuthService);
  bloqueioService = inject(BloqueioService);
  padraoService = inject(PadraoBloqueioService);
  obreiroService = inject(ObreiroService);
  mesService = inject(MesService);

  formatMesReferencia = formatMesReferencia;
  Number = Number;
  viewMode: 'obreiros' | 'dias' = 'obreiros';

  bloqueios = this.bloqueioService.bloqueios;
  padroes = this.padraoService.padroes;
  obreiros = this.obreiroService.obreiros;
  meses = this.mesService.meses;

  searchQuery = signal<string>('');
  selectedObreiroFilter = signal<number>(0);
  selectedMesFilter = signal<string>(''); // e.g. '2026-09' or ''
  TurnoEnum = TurnoEnum;

  isModalOpen = false;
  isGeradorModalOpen = false;
  isConfirmOpen = false;
  selectedBloqueio: Bloqueio | null = null;
  selectedGroupToDelete: ObreiroBloqueioGroup | null = null;
  selectedDiaToDelete: DiaBloqueioGroup | null = null;
  defaultObreiroId: number | null = null;
  defaultDate: string | null = null;

  filteredBloqueios = computed(() => {
    let list = this.bloqueios();
    const query = this.searchQuery().toLowerCase().trim();
    const obreiroId = this.selectedObreiroFilter();
    const mesKey = this.selectedMesFilter(); // 'YYYY-MM'

    // Filter by Month
    if (mesKey) {
      list = list.filter(b => b.data && b.data.startsWith(mesKey));
    }

    // Filter by Obreiro
    if (obreiroId > 0) {
      list = list.filter(b => b.id_obreiro === obreiroId);
    }

    // Filter by search query
    if (query) {
      list = list.filter(b => 
        (b.obreiros?.nome && b.obreiros.nome.toLowerCase().includes(query)) ||
        (b.motivo && b.motivo.toLowerCase().includes(query))
      );
    }

    return list;
  });

  // Estado de Colapso dos Obreiros
  expandedObreiros = signal<Set<number>>(new Set<number>());

  isObreiroExpanded(idObreiro?: number): boolean {
    if (!idObreiro) return false;
    return this.expandedObreiros().has(idObreiro);
  }

  toggleObreiroExpand(idObreiro?: number) {
    if (!idObreiro) return;
    this.expandedObreiros.update(prev => {
      const next = new Set(prev);
      if (next.has(idObreiro)) {
        next.delete(idObreiro);
      } else {
        next.add(idObreiro);
      }
      return next;
    });
  }

  expandAllObreiros() {
    const allIds = this.groupedByObreiro()
      .map(g => g.obreiro.id_obreiro)
      .filter((id): id is number => typeof id === 'number');
    this.expandedObreiros.set(new Set(allIds));
  }

  collapseAllObreiros() {
    this.expandedObreiros.set(new Set());
  }

  groupedByObreiro = computed<ObreiroBloqueioGroup[]>(() => {
    const list = this.filteredBloqueios();
    const map = new Map<number, ObreiroBloqueioGroup>();

    for (const b of list) {
      const obId = b.id_obreiro;
      if (!map.has(obId)) {
        const obreiro = b.obreiros || this.obreiroService.obreiros().find(o => o.id_obreiro === obId) || {
          id_obreiro: obId,
          nome: `Obreiro #${obId}`
        };
        map.set(obId, {
          obreiro,
          bloqueios: []
        });
      }
      map.get(obId)!.bloqueios.push(b);
    }

    // Deduplicar e ordenar cronologicamente
    for (const group of map.values()) {
      const seen = new Set<string>();
      const distinct: Bloqueio[] = [];
      for (const b of group.bloqueios) {
        const k = `${b.data}_${b.turno}`;
        if (!seen.has(k)) {
          seen.add(k);
          distinct.push(b);
        }
      }
      group.bloqueios = distinct.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    }

    return Array.from(map.values()).sort((a, b) => 
      (a.obreiro.nome || '').localeCompare(b.obreiro.nome || '')
    );
  });

  groupedByDia = computed<DiaBloqueioGroup[]>(() => {
    const list = this.filteredBloqueios();
    const map = new Map<string, Bloqueio[]>();

    for (const b of list) {
      if (!b.data) continue;
      if (!map.has(b.data)) {
        map.set(b.data, []);
      }
      map.get(b.data)!.push(b);
    }

    const sortedDates = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    return sortedDates.map(dateStr => {
      const bList = map.get(dateStr)!;
      // Deduplicar obreiros com mesmo turno no mesmo dia
      const seen = new Set<string>();
      const distinctList: Bloqueio[] = [];
      for (const b of bList) {
        const k = `${b.id_obreiro}_${b.turno}`;
        if (!seen.has(k)) {
          seen.add(k);
          distinctList.push(b);
        }
      }
      distinctList.sort((a, b) => (a.obreiros?.nome || '').localeCompare(b.obreiros?.nome || ''));

      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const diaSemana = diasSemana[dateObj.getDay()];

      return {
        data: dateStr,
        dateObj,
        dataFormatada: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
        diaSemana,
        bloqueios: distinctList,
        turnosCount: {
          manha: distinctList.filter(b => b.turno === TurnoEnum.MANHA).length,
          tarde: distinctList.filter(b => b.turno === TurnoEnum.TARDE).length,
          noite: distinctList.filter(b => b.turno === TurnoEnum.NOITE).length,
          integral: distinctList.filter(b => b.turno === TurnoEnum.INTEGRAL || b.turno === 0).length,
        }
      };
    });
  });

  // Métricas
  totalBloqueios = computed(() => this.filteredBloqueios().length);
  totalObreirosBloqueados = computed(() => this.groupedByObreiro().length);
  totalDiasComBloqueio = computed(() => this.groupedByDia().length);

  diaMaisCritico = computed(() => {
    const dias = this.groupedByDia();
    if (dias.length === 0) return null;
    let max = dias[0];
    for (const d of dias) {
      if (d.bloqueios.length > max.bloqueios.length) {
        max = d;
      }
    }
    return max;
  });

  async ngOnInit() {
    this.bloqueioService.fetchAll();
    this.padraoService.fetchAll();
    this.obreiroService.fetchAll();
    const meses = await this.mesService.fetchAll();
    if (!this.selectedMesFilter()) {
      const cur = findCurrentMes(meses);
      if (cur) {
        this.selectedMesFilter.set(this.formatMesKey(cur));
      }
    }
  }

  formatMesKey(m: any): string {
    return `${m.ano_referencia}-${String(m.mes_referencia).padStart(2, '0')}`;
  }

  getTurnoLabel(turno: number): string {
    return TURNO_LABELS[turno] || 'Geral';
  }

  getTurnoStyle(turno: number) {
    return TURNO_COLORS[turno] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  }

  getInitials(name?: string): string {
    if (!name) return 'OB';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  openCreateModal(preselectedObreiroId?: number, preselectedDate?: string) {
    this.selectedBloqueio = null;
    this.selectedGroupToDelete = null;
    this.selectedDiaToDelete = null;
    this.defaultObreiroId = preselectedObreiroId || null;
    this.defaultDate = preselectedDate || null;
    this.isModalOpen = true;
  }

  openEditModal(item: Bloqueio) {
    this.selectedBloqueio = item;
    this.selectedGroupToDelete = null;
    this.selectedDiaToDelete = null;
    this.defaultObreiroId = null;
    this.defaultDate = null;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedBloqueio = null;
    this.selectedGroupToDelete = null;
    this.selectedDiaToDelete = null;
    this.defaultObreiroId = null;
    this.defaultDate = null;
  }

  openDeleteConfirm(item: Bloqueio) {
    this.selectedBloqueio = item;
    this.selectedGroupToDelete = null;
    this.selectedDiaToDelete = null;
    this.isConfirmOpen = true;
  }

  openDeleteGroupConfirm(group: ObreiroBloqueioGroup) {
    this.selectedBloqueio = null;
    this.selectedGroupToDelete = group;
    this.selectedDiaToDelete = null;
    this.isConfirmOpen = true;
  }

  openDeleteDiaConfirm(dia: DiaBloqueioGroup) {
    this.selectedBloqueio = null;
    this.selectedGroupToDelete = null;
    this.selectedDiaToDelete = dia;
    this.isConfirmOpen = true;
  }

  getDeleteConfirmTitle(): string {
    if (this.selectedGroupToDelete) {
      return `Excluir Bloqueios de ${this.selectedGroupToDelete.obreiro.nome}`;
    }
    if (this.selectedDiaToDelete) {
      return `Excluir Bloqueios de ${this.selectedDiaToDelete.dataFormatada}`;
    }
    return 'Excluir Bloqueio';
  }

  getDeleteConfirmMessage(): string {
    if (this.selectedGroupToDelete) {
      const count = this.selectedGroupToDelete.bloqueios.length;
      return `Tem certeza que deseja remover todos os ${count} bloqueio(s) de ${this.selectedGroupToDelete.obreiro.nome} no período atual?`;
    }
    if (this.selectedDiaToDelete) {
      const count = this.selectedDiaToDelete.bloqueios.length;
      return `Tem certeza que deseja remover todos os ${count} bloqueio(s) do dia ${this.selectedDiaToDelete.dataFormatada} (${this.selectedDiaToDelete.diaSemana})?`;
    }
    return 'Tem certeza que deseja remover este bloqueio? O obreiro voltará a figurar como disponível nesta data.';
  }

  closeConfirm() {
    this.isConfirmOpen = false;
    this.selectedBloqueio = null;
    this.selectedGroupToDelete = null;
    this.selectedDiaToDelete = null;
  }

  async handleSave(payload: BloqueioBatchPayload) {
    if (this.selectedBloqueio && this.selectedBloqueio.id_bloqueio) {
      // Editing single record
      const res = await this.bloqueioService.update(this.selectedBloqueio.id_bloqueio, {
        id_obreiro: payload.id_obreiro,
        data: payload.datas[0],
        turno: payload.turnos[0] || TurnoEnum.MANHA,
        motivo: payload.motivo
      });
      if (res) this.closeModal();
    } else {
      // Generate combination of all dates and all selected turnos
      const dtos: CreateBloqueioDto[] = [];
      for (const dataStr of payload.datas) {
        for (const turnoNum of payload.turnos) {
          dtos.push({
            id_obreiro: payload.id_obreiro,
            data: dataStr,
            turno: turnoNum,
            motivo: payload.motivo
          });
        }
      }

      const res = await this.bloqueioService.createBatch(dtos);
      if (res) this.closeModal();
    }
  }

  async handleDelete() {
    if (this.selectedGroupToDelete) {
      const ids = this.selectedGroupToDelete.bloqueios
        .map(b => b.id_bloqueio)
        .filter(id => typeof id === 'number') as number[];
      const success = await this.bloqueioService.deleteBatch(ids);
      if (success) this.closeConfirm();
    } else if (this.selectedDiaToDelete) {
      const ids = this.selectedDiaToDelete.bloqueios
        .map(b => b.id_bloqueio)
        .filter(id => typeof id === 'number') as number[];
      const success = await this.bloqueioService.deleteBatch(ids);
      if (success) this.closeConfirm();
    } else if (this.selectedBloqueio && this.selectedBloqueio.id_bloqueio) {
      const success = await this.bloqueioService.delete(this.selectedBloqueio.id_bloqueio);
      if (success) this.closeConfirm();
    }
  }
}