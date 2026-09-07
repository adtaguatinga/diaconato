import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PadraoBloqueioService } from '../../core/services/padrao-bloqueio.service';
import { ObreiroService } from '../../core/services/obreiro.service';
import { MesService } from '../../core/services/mes.service';
import { BloqueioService } from '../../core/services/bloqueio.service';
import { AuthService } from '../../core/services/auth.service';
import { 
  PadraoBloqueio, 
  CreatePadraoBloqueioDto, 
  UpdatePadraoBloqueioDto,
  TipoRegraBloqueio,
  formatarDescricaoRegra,
  TIPO_REGRA_METADATA 
} from '../../core/models/padrao-bloqueio.model';
import { TURNO_LABELS, TURNO_COLORS } from '../../core/models/turno.enum';
import { PadraoBloqueioModalComponent } from './padrao-bloqueio-modal.component';
import { GeradorBloqueiosModalComponent } from './gerador-bloqueios-modal.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

@Component({
  selector: 'app-padroes-bloqueio-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    PadraoBloqueioModalComponent, 
    GeradorBloqueiosModalComponent,
    ConfirmModalComponent
  ],
  templateUrl: './padroes-bloqueio-list.component.html'
})
export class PadroesBloqueioListComponent implements OnInit {
  authService = inject(AuthService);
  padraoService = inject(PadraoBloqueioService);
  obreiroService = inject(ObreiroService);
  mesService = inject(MesService);
  bloqueioService = inject(BloqueioService);

  formatarDescricaoRegra = formatarDescricaoRegra;
  TIPO_REGRA_METADATA = TIPO_REGRA_METADATA;
  TURNO_LABELS = TURNO_LABELS;
  TURNO_COLORS = TURNO_COLORS;
  Number = Number;

  padroes = this.padraoService.padroes;
  obreiros = this.obreiroService.obreiros;
  meses = this.mesService.meses;

  searchQuery = signal<string>('');
  selectedObreiroFilter = signal<number>(0);
  selectedTipoRegraFilter = signal<string>('todos');
  selectedStatusFilter = signal<'todos' | 'ativos' | 'inativos'>('todos');

  // Modais
  isFormModalOpen = false;
  isGeradorModalOpen = false;
  isConfirmModalOpen = false;

  padraoSelecionado: PadraoBloqueio | null = null;
  padraoParaExcluir: PadraoBloqueio | null = null;

  async ngOnInit() {
    await Promise.all([
      this.padraoService.fetchAll(),
      this.obreiroService.fetchAll(),
      this.mesService.fetchAll(),
      this.bloqueioService.fetchAll()
    ]);
  }

  filteredPadroes = computed(() => {
    let list = this.padroes();
    const query = this.searchQuery().toLowerCase().trim();
    const obId = this.selectedObreiroFilter();
    const tipo = this.selectedTipoRegraFilter();
    const status = this.selectedStatusFilter();

    if (obId > 0) {
      list = list.filter(p => p.id_obreiro === obId);
    }

    if (tipo !== 'todos') {
      list = list.filter(p => p.tipo_regra === tipo);
    }

    if (status === 'ativos') {
      list = list.filter(p => p.ativo !== false);
    } else if (status === 'inativos') {
      list = list.filter(p => p.ativo === false);
    }

    if (query) {
      list = list.filter(p => {
        const nome = p.obreiros?.nome?.toLowerCase() || '';
        const apelido = p.obreiros?.apelido?.toLowerCase() || '';
        const motivo = p.motivo?.toLowerCase() || '';
        const desc = formatarDescricaoRegra(p).toLowerCase();
        return nome.includes(query) || apelido.includes(query) || motivo.includes(query) || desc.includes(query);
      });
    }

    return list;
  });

  totalAtivos = computed(() => this.padroes().filter(p => p.ativo !== false).length);
  totalInativos = computed(() => this.padroes().filter(p => p.ativo === false).length);

  getInitials(name?: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  abrirNovoModal() {
    this.padraoSelecionado = null;
    this.isFormModalOpen = true;
  }

  abrirEditarModal(p: PadraoBloqueio) {
    this.padraoSelecionado = p;
    this.isFormModalOpen = true;
  }

  async handleSavePadrao(data: CreatePadraoBloqueioDto | { id: number; dto: UpdatePadraoBloqueioDto }) {
    if ('id' in data) {
      await this.padraoService.update(data.id, data.dto);
    } else {
      await this.padraoService.create(data);
    }
    this.isFormModalOpen = false;
  }

  async toggleAtivo(p: PadraoBloqueio) {
    if (!p.id_padrao_bloqueio) return;
    await this.padraoService.toggleAtivo(p.id_padrao_bloqueio, !p.ativo);
  }

  confirmarExclusao(p: PadraoBloqueio) {
    this.padraoParaExcluir = p;
    this.isConfirmModalOpen = true;
  }

  async executarExclusao() {
    if (!this.padraoParaExcluir?.id_padrao_bloqueio) return;
    await this.padraoService.delete(this.padraoParaExcluir.id_padrao_bloqueio);
    this.isConfirmModalOpen = false;
    this.padraoParaExcluir = null;
  }
}
