import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Mes, formatMesReferencia, findCurrentMes } from '../../core/models/mes.model';
import { Obreiro } from '../../core/models/obreiro.model';
import { PadraoBloqueio, formatarDescricaoRegra } from '../../core/models/padrao-bloqueio.model';
import { PadraoBloqueioService, ResultadoPreviaGeracao } from '../../core/services/padrao-bloqueio.service';
import { BloqueioService } from '../../core/services/bloqueio.service';
import { TURNO_LABELS } from '../../core/models/turno.enum';

export interface ObreiroPreviaGroup {
  id_obreiro: number;
  nome_obreiro: string;
  apelido_obreiro?: string | null;
  totalNovos: number;
  totalJaExistentes: number;
  itens: any[];
}

@Component({
  selector: 'app-gerador-bloqueios-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gerador-bloqueios-modal.component.html'
})
export class GeradorBloqueiosModalComponent implements OnChanges {
  padraoService = inject(PadraoBloqueioService);
  bloqueioService = inject(BloqueioService);

  @Input() isOpen = false;
  @Input() meses: Mes[] = [];
  @Input() obreiros: Obreiro[] = [];
  @Input() padroes: PadraoBloqueio[] = [];
  @Input() defaultMesId: number | null = null;
  @Input() loading = false;

  @Output() generated = new EventEmitter<{ count: number }>();
  @Output() close = new EventEmitter<void>();

  formatMesReferencia = formatMesReferencia;
  TURNO_LABELS = TURNO_LABELS;

  selectedMesId = signal<number | null>(null);
  selectedObreiroFilter = signal<number>(0);
  searchPreviewQuery = signal<string>('');
  apenasNovos = signal<boolean>(false);
  substituirExistentes = signal<boolean>(false);

  previa = signal<ResultadoPreviaGeracao | null>(null);
  isGenerating = signal<boolean>(false);

  currentMes = computed(() => {
    const id = this.selectedMesId();
    if (!id) return null;
    return this.meses.find(m => m.id_mes === id) || null;
  });

  padroesAtivos = computed(() => {
    return (this.padroes || []).filter(p => p.ativo !== false);
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.substituirExistentes.set(false);
      if (this.defaultMesId) {
        this.selectedMesId.set(this.defaultMesId);
      } else if (this.meses.length > 0) {
        const cur = findCurrentMes(this.meses) || this.meses[0];
        this.selectedMesId.set(cur?.id_mes || null);
      }
      this.atualizarPrevia();
    }
  }

  onMesChange(newMesId: number) {
    this.selectedMesId.set(Number(newMesId));
    this.atualizarPrevia();
  }

  atualizarPrevia() {
    const mesObj = this.currentMes();
    if (!mesObj) {
      this.previa.set(null);
      return;
    }

    const ano = mesObj.ano_referencia;
    const mesNum = mesObj.mes_referencia;

    const res = this.padraoService.calcularPreviaParaMes(
      ano,
      mesNum,
      this.padroesAtivos(),
      this.bloqueioService.bloqueios()
    );

    this.previa.set(res);
  }

  filteredPreviaItens = computed(() => {
    const p = this.previa();
    if (!p) return [];

    let list = p.itens;
    const obId = this.selectedObreiroFilter();
    const query = this.searchPreviewQuery().toLowerCase().trim();
    const soNovos = this.apenasNovos();

    if (obId > 0) {
      list = list.filter(i => i.id_obreiro === obId);
    }

    if (soNovos) {
      list = list.filter(i => !i.jaExiste);
    }

    if (query) {
      list = list.filter(i => 
        i.nome_obreiro.toLowerCase().includes(query) ||
        (i.apelido_obreiro && i.apelido_obreiro.toLowerCase().includes(query)) ||
        i.motivo.toLowerCase().includes(query) ||
        i.data.includes(query)
      );
    }

    return list;
  });

  groupedPreviaByObreiro = computed<ObreiroPreviaGroup[]>(() => {
    const items = this.filteredPreviaItens();
    const map = new Map<number, ObreiroPreviaGroup>();

    for (const item of items) {
      if (!map.has(item.id_obreiro)) {
        map.set(item.id_obreiro, {
          id_obreiro: item.id_obreiro,
          nome_obreiro: item.nome_obreiro,
          apelido_obreiro: item.apelido_obreiro,
          totalNovos: 0,
          totalJaExistentes: 0,
          itens: []
        });
      }
      const g = map.get(item.id_obreiro)!;
      g.itens.push(item);
      if (item.jaExiste) {
        g.totalJaExistentes++;
      } else {
        g.totalNovos++;
      }
    }

    // Ordenar obreiros por nome/apelido
    return Array.from(map.values()).sort((a, b) => {
      const nomeA = a.apelido_obreiro || a.nome_obreiro;
      const nomeB = b.apelido_obreiro || b.nome_obreiro;
      return nomeA.localeCompare(nomeB);
    });
  });

  getInitials(name?: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getDiaSemanaLabel(dataStr: string): string {
    const [y, m, d] = dataStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias[date.getDay()];
  }

  async confirmarGeracao() {
    const p = this.previa();
    if (!p) return;

    const substituir = this.substituirExistentes();
    if (!substituir && p.totalNovos === 0) return;
    if (substituir && p.itens.length === 0) return;

    this.isGenerating.set(true);
    try {
      const res = await this.padraoService.gerarEInserirBloqueiosParaMes(
        p.ano,
        p.mes,
        this.padroesAtivos(),
        substituir
      );

      this.generated.emit({ count: res.criadosCount });
      this.close.emit();
    } finally {
      this.isGenerating.set(false);
    }
  }

  onCancel() {
    this.close.emit();
  }
}
