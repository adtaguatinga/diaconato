import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Area } from '../../core/models/area.model';
import { Local } from '../../core/models/local.model';
import { AreaService } from '../../core/services/area.service';
import { LocalService } from '../../core/services/local.service';
import { ToastService } from '../../core/services/toast.service';

export interface PostoMapaPosition {
  id_local: number;
  nome: string;
  ordem: number;
  posicao_x: number | null; // 0 a 100
  posicao_y: number | null; // 0 a 100
  numero_posto: number;
}

@Component({
  selector: 'app-area-mapa-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen && area) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
        <!-- Backdrop -->
        <div 
          class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity"
          (click)="onClose()">
        </div>

        <!-- Modal Box -->
        <div 
          (click)="$event.stopPropagation()"
          class="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 overflow-hidden z-10 flex flex-col max-h-[92vh] gap-4">
          
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl shrink-0">
                🗺️
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Mapeamento de Postos — {{ area.nome }}</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {{ area.icone || '📍' }} {{ postos().length }} postos
                  </span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">
                  Vincule a imagem da planta/mapa da área e posicione os postos de atuação.
                </p>
              </div>
            </div>

            <button 
              type="button" 
              (click)="onClose()" 
              class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              ✕
            </button>
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto">
            
            <!-- Painel do Mapa (Coluna Esquerda/Principal 2 cols) -->
            <div class="lg:col-span-2 flex flex-col gap-3 min-h-0">
              
              <!-- Controles do Mapa -->
              <div class="flex items-center justify-between gap-2 flex-wrap text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <div class="flex items-center gap-2">
                  <label class="cursor-pointer px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow flex items-center gap-1.5">
                    <span>📷 {{ mapaUrl() ? 'Trocar Imagem do Mapa' : 'Carregar Imagem do Mapa' }}</span>
                    <input type="file" accept="image/*" (change)="onFileSelected($event)" class="hidden" />
                  </label>
                  
                  @if (mapaUrl()) {
                    <button 
                      type="button" 
                      (click)="removerMapa()" 
                      class="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg font-medium transition-colors">
                      Remover Mapa
                    </button>
                  }
                </div>

                <div class="text-[11px] text-slate-400 flex items-center gap-1">
                  @if (postoSelecionadoId()) {
                    <span class="text-amber-400 font-bold animate-pulse">
                      📍 Clique no mapa para posicionar "{{ getPostoSelecionado()?.nome }}"
                    </span>
                  } @else {
                    <span>Selecione um posto ao lado e clique no mapa para posicioná-lo.</span>
                  }
                </div>
              </div>

              <!-- Container da Imagem com Pinos -->
              <div class="flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-2 relative min-h-[300px] sm:min-h-[420px]">
                @if (mapaUrl()) {
                  <div 
                    #mapaContainer
                    (click)="onMapaClick($event)"
                    class="relative max-w-full max-h-full inline-block cursor-crosshair select-none rounded-xl overflow-hidden shadow-inner border border-slate-700/50">
                    <img 
                      [src]="mapaUrl()" 
                      alt="Mapa da Área"
                      class="max-w-full max-h-[60vh] object-contain block pointer-events-none rounded-lg"
                    />

                    <!-- Pinos dos Postos -->
                    @for (p of postos(); track p.id_local) {
                      @if (p.posicao_x !== null && p.posicao_y !== null) {
                        <div 
                          [style.left.%]="p.posicao_x"
                          [style.top.%]="p.posicao_y"
                          (click)="onPinoClick($event, p.id_local)"
                          [class]="postoSelecionadoId() === p.id_local ? 'ring-4 ring-amber-400 scale-125 z-30' : 'hover:scale-110 z-20'"
                          class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform group flex flex-col items-center">
                          
                          <!-- Bolha do Pino -->
                          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black shadow-indigo-900/80">
                            {{ p.numero_posto }}
                          </div>

                          <!-- Tooltip / Label do Posto -->
                          <div class="absolute bottom-full mb-1 px-2 py-0.5 rounded bg-slate-900/90 text-slate-100 text-[10px] font-bold border border-slate-700 shadow-xl whitespace-nowrap pointer-events-none group-hover:block transition-all">
                            {{ p.nome }}
                          </div>
                        </div>
                      }
                    }
                  </div>
                } @else {
                  <div class="text-center p-8 max-w-sm space-y-3">
                    <div class="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-3xl flex items-center justify-center mx-auto text-slate-500">
                      🗺️
                    </div>
                    <div class="space-y-1">
                      <h4 class="text-sm font-bold text-white">Nenhum mapa cadastrado para esta área</h4>
                      <p class="text-xs text-slate-400 leading-relaxed">
                        Faça upload de uma planta baixa, desenho ou foto da área (Igreja, Estacionamento, etc.) para identificar a posição de cada posto.
                      </p>
                    </div>
                    <label class="inline-flex cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                      <span>📁 Escolher Arquivo de Imagem</span>
                      <input type="file" accept="image/*" (change)="onFileSelected($event)" class="hidden" />
                    </label>
                  </div>
                }
              </div>

            </div>

            <!-- Painel Lateral: Lista de Postos da Área (Coluna Direita 1 col) -->
            <div class="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 min-h-0">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Postos desta Área</span>
                <span class="text-[10px] text-slate-400 font-semibold">
                  {{ getPosicionadosCount() }} de {{ postos().length }} mapeados
                </span>
              </div>

              <!-- Lista com scroll -->
              <div class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                @if (postos().length === 0) {
                  <div class="py-8 text-center text-xs text-slate-500">
                    Nenhum posto cadastrado nesta área. Cadastre postos na lista de locais.
                  </div>
                } @else {
                  @for (p of postos(); track p.id_local) {
                    <div 
                      (click)="selecionarPostoParaPosicionar(p.id_local)"
                      [class]="postoSelecionadoId() === p.id_local 
                        ? 'border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/50' 
                        : (p.posicao_x !== null ? 'border-slate-800 bg-slate-900/80 hover:border-slate-700' : 'border-dashed border-slate-800 bg-slate-900/40 hover:border-slate-700')"
                      class="p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 text-xs select-none">
                      
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div 
                          [class]="p.posicao_x !== null ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'"
                          class="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                          {{ p.numero_posto }}
                        </div>

                        <div class="min-w-0">
                          <span class="font-bold text-slate-200 block truncate">{{ p.nome }}</span>
                          <span class="text-[10px] text-slate-400 block">
                            @if (p.posicao_x !== null) {
                              <span class="text-emerald-400 font-semibold">✓ Posicionado</span> (X: {{ p.posicao_x | number:'1.0-0' }}%, Y: {{ p.posicao_y | number:'1.0-0' }}%)
                            } @else {
                              <span class="text-amber-400/80">⚠️ Não posicionado</span>
                            }
                          </span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1 shrink-0">
                        @if (p.posicao_x !== null) {
                          <button 
                            type="button" 
                            (click)="limparPosicaoPosto($event, p.id_local)"
                            title="Remover posição no mapa"
                            class="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800">
                            ✕
                          </button>
                        }
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- Dica -->
              <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 space-y-1">
                <span class="font-bold block">💡 Como posicionar:</span>
                <p class="text-slate-400 text-[10px] leading-relaxed">
                  Clique no posto que deseja marcar na lista e depois clique no local exato do mapa.
                </p>
              </div>

            </div>

          </div>

          <!-- Footer -->
          <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <span class="text-xs text-slate-400 font-medium hidden sm:inline">
              {{ getPosicionadosCount() }} posto(s) posicionados no mapa da área
            </span>

            <div class="flex items-center justify-end gap-2 w-full sm:w-auto">
              <button 
                type="button" 
                (click)="onClose()"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button 
                type="button" 
                (click)="salvarTudo()"
                [disabled]="isSaving()"
                class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2">
                @if (isSaving()) {
                  <span class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>Salvando Mapa...</span>
                } @else {
                  <span>💾 Salvar Mapa & Postos</span>
                }
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `
})
export class AreaMapaModalComponent implements OnChanges {
  private areaService = inject(AreaService);
  private localService = inject(LocalService);
  private toast = inject(ToastService);

  @Input() isOpen = false;
  @Input() area: Area | null = null;
  @Input() locaisDaArea: Local[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  mapaUrl = signal<string | null>(null);
  postos = signal<PostoMapaPosition[]>([]);
  postoSelecionadoId = signal<number | null>(null);
  isSaving = signal<boolean>(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && this.area) {
      this.mapaUrl.set(this.area.mapa_url || null);
      this.inicializarPostos();
    }
  }

  private inicializarPostos() {
    const list = (this.locaisDaArea || []).map((loc, idx) => ({
      id_local: loc.id_local,
      nome: loc.nome,
      ordem: loc.ordem ?? idx + 1,
      posicao_x: loc.posicao_x !== undefined && loc.posicao_x !== null ? Number(loc.posicao_x) : null,
      posicao_y: loc.posicao_y !== undefined && loc.posicao_y !== null ? Number(loc.posicao_y) : null,
      numero_posto: loc.numero_posto || loc.ordem || idx + 1
    }));
    this.postos.set(list);
    this.postoSelecionadoId.set(null);
  }

  getPosicionadosCount(): number {
    return this.postos().filter(p => p.posicao_x !== null && p.posicao_y !== null).length;
  }

  getPostoSelecionado(): PostoMapaPosition | undefined {
    const id = this.postoSelecionadoId();
    if (!id) return undefined;
    return this.postos().find(p => p.id_local === id);
  }

  selecionarPostoParaPosicionar(idLocal: number) {
    if (this.postoSelecionadoId() === idLocal) {
      this.postoSelecionadoId.set(null);
    } else {
      this.postoSelecionadoId.set(idLocal);
    }
  }

  onMapaClick(event: MouseEvent) {
    const id = this.postoSelecionadoId();
    if (!id) {
      // Se não há posto selecionado, seleciona o primeiro não posicionado
      const naoPosicionado = this.postos().find(p => p.posicao_x === null || p.posicao_y === null);
      if (naoPosicionado) {
        this.postoSelecionadoId.set(naoPosicionado.id_local);
      }
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Atualiza o posto selecionado
    this.postos.update(list => list.map(p => {
      if (p.id_local === id) {
        return {
          ...p,
          posicao_x: Math.round(x * 10) / 10,
          posicao_y: Math.round(y * 10) / 10
        };
      }
      return p;
    }));

    // Auto-seleciona o próximo posto não posicionado para agilizar
    const restantes = this.postos().filter(p => p.id_local !== id && (p.posicao_x === null || p.posicao_y === null));
    if (restantes.length > 0) {
      this.postoSelecionadoId.set(restantes[0].id_local);
    } else {
      this.postoSelecionadoId.set(null);
    }
  }

  onPinoClick(event: MouseEvent, idLocal: number) {
    event.stopPropagation();
    this.selecionarPostoParaPosicionar(idLocal);
  }

  limparPosicaoPosto(event: MouseEvent, idLocal: number) {
    event.stopPropagation();
    this.postos.update(list => list.map(p => {
      if (p.id_local === idLocal) {
        return { ...p, posicao_x: null, posicao_y: null };
      }
      return p;
    }));
    if (this.postoSelecionadoId() === idLocal) {
      this.postoSelecionadoId.set(null);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Arquivo Inválido', 'Por favor, selecione uma imagem (PNG, JPG, WEBP).');
      return;
    }

    // Leitor de arquivo e redimensionamento otimizado
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona para max 1600px mantendo proporção e qualidade
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          this.mapaUrl.set(dataUrl);
          this.toast.success('Imagem Carregada', 'Imagem do mapa pronta para posicionamento dos postos.');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removerMapa() {
    this.mapaUrl.set(null);
  }

  async salvarTudo() {
    if (!this.area) return;

    this.isSaving.set(true);
    try {
      // 1. Atualiza mapa da Área
      await this.areaService.updateArea(this.area.id_area, {
        mapa_url: this.mapaUrl()
      });

      // 2. Atualiza coordenadas de cada posto
      const atualizacoes = this.postos().map(p => ({
        id_local: p.id_local,
        posicao_x: p.posicao_x,
        posicao_y: p.posicao_y,
        numero_posto: p.numero_posto
      }));

      await this.localService.updateCoordenadasBatch(atualizacoes);
      await this.localService.fetchLocais();
      await this.areaService.fetchAreas();

      this.saved.emit();
      this.close.emit();
    } catch (err: any) {
      console.error('Erro ao salvar mapa da área:', err);
      this.toast.error('Erro ao Salvar', err.message || 'Falha ao gravar mapa.');
    } finally {
      this.isSaving.set(false);
    }
  }

  onClose() {
    this.close.emit();
  }
}
