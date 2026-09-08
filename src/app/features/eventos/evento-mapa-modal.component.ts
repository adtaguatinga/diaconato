import { 
  Component, 
  computed, 
  ElementRef, 
  inject, 
  input, 
  output, 
  signal, 
  ViewChild, 
  effect 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../core/models/evento.model';
import { Area } from '../../core/models/area.model';
import { Local } from '../../core/models/local.model';
import { Escala } from '../../core/models/escala.model';
import { ToastService } from '../../core/services/toast.service';

export interface PostoAlocacaoDisplay {
  local: Local;
  numero_posto: number;
  posicao_x: number | null;
  posicao_y: number | null;
  escalas: Escala[];
  nomesObreiros: string[];
  isAlocado: boolean;
  posicaoBadge: 'bottom' | 'top';
}

@Component({
  selector: 'app-evento-mapa-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen() && evento()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
        <!-- Backdrop -->
        <div 
          class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity"
          (click)="onClose()">
        </div>

        <!-- Modal Box -->
        <div 
          (click)="$event.stopPropagation()"
          class="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 overflow-hidden z-10 flex flex-col max-h-[94vh] gap-3.5">
          
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl shrink-0">
                🗺️
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Mapa de Posicionamento</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {{ evento()?.descricao || 'Culto' }}
                  </span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">
                  Visualização gráfica de onde cada obreiro deve se posicionar durante o culto.
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

          <!-- Selectors Bar (Área & Horário) -->
          <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-3 flex-wrap">
              <!-- Seletor de Área -->
              <div>
                <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Setor / Área de Atuação</label>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (a of areasDisponiveis(); track a.id_area) {
                    <button 
                      type="button"
                      (click)="selectedAreaId.set(a.id_area)"
                      [class]="selectedAreaId() === a.id_area ? 'bg-indigo-600 text-white font-bold shadow' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'"
                      class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5">
                      <span>{{ a.icone || '📍' }}</span>
                      <span>{{ a.nome }}</span>
                      @if (a.mapa_url) {
                        <span class="text-[9px] opacity-70">🗺️</span>
                      }
                    </button>
                  }
                </div>
              </div>

              <!-- Seletor de Horário / Turno -->
              <div>
                <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Horário do Culto</label>
                <div class="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button 
                    type="button"
                    (click)="selectedHorario.set(1)"
                    [class]="selectedHorario() === 1 ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'"
                    class="px-3 py-1 rounded-lg text-xs transition-all">
                    1º Horário
                  </button>
                  @if (evento()?.n_segundo_horario) {
                    <button 
                      type="button"
                      (click)="selectedHorario.set(2)"
                      [class]="selectedHorario() === 2 ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'"
                      class="px-3 py-1 rounded-lg text-xs transition-all">
                      2º Horário
                    </button>
                  }
                  @if (evento()?.n_terceiro_horario) {
                    <button 
                      type="button"
                      (click)="selectedHorario.set(3)"
                      [class]="selectedHorario() === 3 ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'"
                      class="px-3 py-1 rounded-lg text-xs transition-all">
                      3º Horário
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Botões de Ação -->
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Abas para Mobile (Mapa / Lista) -->
              <div class="flex items-center lg:hidden bg-slate-900 border border-slate-700/80 rounded-xl p-0.5">
                <button 
                  type="button" 
                  (click)="mobileTab.set('mapa')"
                  [class]="mobileTab() === 'mapa' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
                  class="px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1">
                  <span>🗺️ Mapa</span>
                </button>
                <button 
                  type="button" 
                  (click)="mobileTab.set('lista')"
                  [class]="mobileTab() === 'lista' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
                  class="px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1">
                  <span>📋 Lista ({{ postosCalculados().length }})</span>
                </button>
              </div>

              <!-- Botão Baixar PNG -->
              <button 
                type="button"
                (click)="baixarImagem()"
                [disabled]="isGeneratingImage()"
                class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-indigo-600/20 disabled:opacity-50">
                <span>📥 Baixar Imagem (PNG)</span>
              </button>
            </div>
          </div>

          <!-- Main Layout: Mapa + Legenda Lateral -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto">
            
            <!-- Visualizador do Mapa (Coluna Principal 2 cols) -->
            <div 
              #viewportElement
              [class.hidden]="mobileTab() === 'lista'"
              (mousedown)="onMouseDown($event)"
              (mousemove)="onMouseMove($event)"
              (mouseup)="onMouseUp()"
              (mouseleave)="onMouseUp()"
              (touchstart)="onTouchStart($event)"
              (touchmove)="onTouchMove($event)"
              (touchend)="onTouchEnd()"
              class="lg:block lg:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 p-2 sm:p-3 relative flex-1 min-h-[380px] sm:min-h-[480px] max-h-[68vh] overflow-auto select-none cursor-grab active:cursor-grabbing">
              
              @if (currentArea()?.mapa_url) {
                <!-- Floating Zoom & Display Toolbar -->
                <div class="sticky top-2 right-2 float-right z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-2xl">
                  <!-- Botão Alternar Exibição de Balões -->
                  <button 
                    type="button" 
                    (click)="toggleBaloes()"
                    [class]="exibirBaloesSempre() ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'"
                    class="px-2 h-7 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                    title="Alternar entre exibir balões em todos os pinos ou apenas ao tocar/passar o mouse">
                    <span>🏷️</span>
                    <span class="hidden sm:inline">{{ exibirBaloesSempre() ? 'Ocultar Balões' : 'Fixar Balões' }}</span>
                  </button>

                  <div class="w-px h-4 bg-slate-700 mx-0.5"></div>

                  <button 
                    type="button" 
                    (click)="zoomOut()" 
                    [disabled]="zoomLevel() <= 0.75"
                    class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm disabled:opacity-30 transition-all active:scale-95"
                    title="Diminuir Zoom">
                    −
                  </button>
                  
                  <button 
                    type="button" 
                    (click)="resetZoom()" 
                    class="px-2 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-bold text-indigo-300 flex items-center justify-center transition-all active:scale-95"
                    title="Redefinir Zoom (100%)">
                    {{ zoomPercentage() }}%
                  </button>

                  <button 
                    type="button" 
                    (click)="zoomIn()" 
                    [disabled]="zoomLevel() >= 3.0"
                    class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm disabled:opacity-30 transition-all active:scale-95"
                    title="Aumentar Zoom">
                    +
                  </button>

                  @if (zoomLevel() < 1.5) {
                    <button 
                      type="button" 
                      (click)="setZoom(1.75)" 
                      class="px-2 h-7 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-[10px] font-bold text-indigo-200 hover:text-white flex items-center justify-center transition-all active:scale-95"
                      title="Zoom Rápido para Leitura Mobile">
                      🔍 Ampliar
                    </button>
                  }
                </div>

                <!-- Container escalável do mapa com suporte total a Pan/Scroll e m-auto -->
                <div class="min-w-full min-h-full flex items-center justify-start p-1">
                  <div 
                    #mapaPreviewElement
                    [style.width.%]="100 * zoomLevel()"
                    [style.min-width.px]="zoomLevel() > 1 ? 550 * zoomLevel() : null"
                    class="relative transition-[width] duration-150 inline-block select-none rounded-xl overflow-hidden shadow-2xl border border-slate-700/60 m-auto">
                    
                    <img 
                      [src]="currentArea()!.mapa_url!" 
                      alt="Mapa da Área"
                      class="w-full h-auto block rounded-lg pointer-events-none"
                    />

                    <!-- Pinos sobrepostos no mapa -->
                    @for (p of postosCalculados(); track p.local.id_local) {
                      @if (p.posicao_x !== null && p.posicao_y !== null) {
                        <div 
                          [style.left.%]="p.posicao_x"
                          [style.top.%]="p.posicao_y"
                          (click)="selectPin(p.local.id_local); $event.stopPropagation()"
                          [class.z-50]="selectedLocalId() === p.local.id_local"
                          [class.z-20]="selectedLocalId() !== p.local.id_local"
                          class="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 hover:z-50 flex flex-col items-center group pointer-events-auto cursor-pointer">
                          
                          <!-- Bolha do Pino Circular com Indicador -->
                          <div 
                            [class]="selectedLocalId() === p.local.id_local ? 'ring-4 ring-indigo-400 scale-110' : ''"
                            [class.bg-emerald-500]="p.isAlocado"
                            [class.border-white]="p.isAlocado"
                            [class.text-white]="p.isAlocado"
                            [class.shadow-emerald-950/90]="p.isAlocado"
                            [class.bg-slate-700/90]="!p.isAlocado"
                            [class.border-slate-400]="!p.isAlocado"
                            [class.text-slate-300]="!p.isAlocado"
                            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 shadow-lg flex items-center justify-center text-xs font-black shrink-0 transition-all">
                            {{ p.numero_posto }}
                          </div>

                          <!-- Balão Informativo (Nome do Posto + Todos os Obreiros) -->
                          <div 
                            [class]="exibirBaloesSempre() || selectedLocalId() === p.local.id_local 
                              ? 'opacity-100 scale-100 pointer-events-auto' 
                              : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'"
                            [class.bottom-10]="p.posicaoBadge === 'top' || p.posicao_y > 65"
                            [class.top-10]="p.posicaoBadge !== 'top' && p.posicao_y <= 65"
                            class="absolute z-40 px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-slate-700/90 shadow-2xl text-center min-w-[120px] max-w-[190px] backdrop-blur-md transition-all duration-200">
                            
                            <!-- Nome do Posto -->
                            <div class="flex items-center justify-center gap-1.5 mb-1 pb-0.5 border-b border-slate-800">
                              <span class="w-3.5 h-3.5 rounded-full bg-indigo-500/30 text-indigo-300 font-black text-[8px] flex items-center justify-center shrink-0">
                                #{{ p.numero_posto }}
                              </span>
                              <span class="text-[10px] text-sky-400 font-extrabold truncate uppercase tracking-wider">
                                {{ p.local.nome }}
                              </span>
                            </div>

                            <!-- Nomes dos Obreiros Escalados (1, 2 ou mais) -->
                            @if (p.isAlocado) {
                              <div class="space-y-0.5">
                                @for (nome of p.nomesObreiros; track $index) {
                                  <div class="text-[11px] text-white font-black flex items-center justify-center gap-1 truncate">
                                    <span class="text-[10px] text-emerald-400 shrink-0">👤</span>
                                    <span class="truncate">{{ nome }}</span>
                                  </div>
                                }
                              </div>
                            } @else {
                              <span class="text-[9px] text-slate-400 italic block">
                                [Posto Vago]
                              </span>
                            }
                          </div>

                        </div>
                      }
                    }
                  </div>
                </div>
              } @else {
                <div class="text-center p-8 max-w-sm space-y-3 mx-auto my-auto">
                  <div class="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-3xl flex items-center justify-center mx-auto text-slate-500">
                    🗺️
                  </div>
                  <div class="space-y-1">
                    <h4 class="text-sm font-bold text-white">Esta área ainda não possui mapa cadastrado</h4>
                    <p class="text-xs text-slate-400 leading-relaxed">
                      Cadastre a imagem da planta em <strong>Locais & Áreas de Atuação</strong> para visualizar o mapa com pinos.
                    </p>
                  </div>
                </div>
              }
            </div>

            <!-- Painel Lateral com Lista de Postos e Obreiros (Coluna 1 col) -->
            <div 
              [class.hidden]="mobileTab() === 'mapa'"
              class="lg:block bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 min-h-0">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Escala do {{ selectedHorario() }}º Horário</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {{ getTotalObreirosAlocados() }} obreiros / {{ postosCalculados().length }} postos
                </span>
              </div>

              <!-- Lista de Postos com Scroll -->
              <div class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                @for (p of postosCalculados(); track p.local.id_local) {
                  <div 
                    (click)="selectPin(p.local.id_local)"
                    [class]="selectedLocalId() === p.local.id_local ? 'ring-2 ring-indigo-400 bg-indigo-950/40 border-indigo-500/50' : (p.isAlocado ? 'border-emerald-500/30 bg-slate-900/90 hover:border-emerald-500/60' : 'border-slate-800/80 bg-slate-900/40 opacity-70 hover:opacity-100')"
                    class="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer">
                    
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div 
                        [class]="p.isAlocado ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'"
                        class="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                        {{ p.numero_posto }}
                      </div>

                      <div class="min-w-0">
                        <span class="font-bold text-slate-200 block truncate">{{ p.local.nome }}</span>
                        @if (p.isAlocado) {
                          <div class="space-y-0.5 mt-0.5">
                            @for (nome of p.nomesObreiros; track $index) {
                              <span class="text-[11px] font-bold text-emerald-300 block truncate">
                                👤 {{ nome }}
                              </span>
                            }
                          </div>
                        } @else {
                          <span class="text-[10px] text-slate-500 italic block">
                            Nenhum obreiro alocado
                          </span>
                        }
                      </div>
                    </div>

                    <div class="shrink-0">
                      @if (p.isAlocado) {
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {{ p.nomesObreiros.length > 1 ? p.nomesObreiros.length + ' obreiros' : 'Ocupado' }}
                        </span>
                      } @else {
                        <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Vago
                        </span>
                      }
                    </div>

                  </div>
                }
              </div>

            </div>

          </div>

          <!-- Footer -->
          <div class="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <span class="text-xs text-slate-400 font-medium hidden sm:inline">
              Dica: Utilize os botões + e − ou Ampliar para dar zoom no mapa e visualizar os postos com clareza.
            </span>

            <button 
              type="button" 
              (click)="onClose()"
              class="px-5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors ml-auto">
              Fechar
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class EventoMapaModalComponent {
  private toast = inject(ToastService);

  isOpen = input<boolean>(false);
  evento = input<Evento | null>(null);
  areas = input<Area[]>([]);
  locais = input<Local[]>([]);
  escalas = input<Escala[]>([]);
  defaultAreaId = input<number | null>(null);
  defaultHorario = input<number | null>(null);

  close = output<void>();

  selectedAreaId = signal<number>(0);
  selectedHorario = signal<number>(1);
  isGeneratingImage = signal<boolean>(false);

  // Controles de Visualização e Zoom
  zoomLevel = signal<number>(1);
  mobileTab = signal<'mapa' | 'lista'>('mapa');
  zoomPercentage = computed(() => Math.round(this.zoomLevel() * 100));
  selectedLocalId = signal<number | null>(null);
  exibirBaloesSempre = signal<boolean>(true);

  areasDisponiveis = computed(() => {
    return (this.areas() || []).filter(a => a.ativo !== false);
  });

  currentArea = computed(() => {
    const id = this.selectedAreaId();
    if (!id) return null;
    return this.areas().find(a => a.id_area === id) || null;
  });

  postosCalculados = computed<PostoAlocacaoDisplay[]>(() => {
    const areaId = this.selectedAreaId();
    const horario = this.selectedHorario();
    if (!areaId) return [];

    const locaisDaArea = (this.locais() || [])
      .filter(l => l.id_area === areaId && l.ativo !== false)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));

    const escalasDoHorario = (this.escalas() || []).filter(e => {
      const h = Number(e.horario_turno ?? 1);
      return h === horario && !!e.id_local;
    });

    const baseList = locaisDaArea.map((loc, idx) => {
      const escalasDoLocal = escalasDoHorario.filter(e => e.id_local === loc.id_local);
      const isAlocado = escalasDoLocal.length > 0;

      const nomesObreiros = escalasDoLocal.map(e => {
        const apelido = e.obreiros?.apelido?.trim();
        const nomeCompleto = e.obreiros?.nome?.trim();
        return apelido || nomeCompleto || (e.id_obreiro ? `Obreiro #${e.id_obreiro}` : 'Obreiro');
      });

      return {
        local: loc,
        numero_posto: loc.numero_posto || loc.ordem || idx + 1,
        posicao_x: loc.posicao_x !== undefined && loc.posicao_x !== null ? Number(loc.posicao_x) : null,
        posicao_y: loc.posicao_y !== undefined && loc.posicao_y !== null ? Number(loc.posicao_y) : null,
        escalas: escalasDoLocal,
        nomesObreiros,
        isAlocado,
        posicaoBadge: 'bottom' as 'bottom' | 'top'
      };
    });

    // Algoritmo anti-colisão de balões no mapa
    const processed: PostoAlocacaoDisplay[] = [];
    for (let i = 0; i < baseList.length; i++) {
      const item = { ...baseList[i] };
      if (item.posicao_x !== null && item.posicao_y !== null) {
        const isNearBottom = item.posicao_y > 75;
        const isNearTop = item.posicao_y < 20;

        // Verifica se algum pino anterior próximo já colocou balão em 'bottom'
        const hasCloseBottomNeighbor = processed.some(prev =>
          prev.posicao_x !== null && prev.posicao_y !== null &&
          Math.abs(prev.posicao_x - item.posicao_x!) < 18 &&
          Math.abs(prev.posicao_y - item.posicao_y!) < 16 &&
          prev.posicaoBadge === 'bottom'
        );

        if ((hasCloseBottomNeighbor || isNearBottom) && !isNearTop) {
          item.posicaoBadge = 'top';
        } else {
          item.posicaoBadge = 'bottom';
        }
      }
      processed.push(item);
    }

    return processed;
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const ev = this.evento();
      const arrAreas = this.areas();
      const defArea = this.defaultAreaId();
      const defHorario = this.defaultHorario();

      if (open && ev) {
        this.zoomLevel.set(1);
        this.mobileTab.set('mapa');

        if (defArea) {
          this.selectedAreaId.set(defArea);
        } else if (arrAreas.length > 0 && (!this.selectedAreaId() || !arrAreas.some(a => a.id_area === this.selectedAreaId()))) {
          this.selectedAreaId.set(arrAreas[0].id_area);
        }

        if (defHorario) {
          this.selectedHorario.set(defHorario);
        } else if (!this.selectedHorario()) {
          this.selectedHorario.set(1);
        }
      }
    });
  }

  @ViewChild('viewportElement') viewportElement?: ElementRef<HTMLDivElement>;

  // Variáveis para Pan/Drag suave
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private scrollLeft = 0;
  private scrollTop = 0;

  zoomIn() {
    this.zoomLevel.update(z => Math.min(Number((z + 0.25).toFixed(2)), 3.0));
  }

  zoomOut() {
    this.zoomLevel.update(z => Math.max(Number((z - 0.25).toFixed(2)), 0.75));
  }

  setZoom(val: number) {
    this.zoomLevel.set(val);
  }

  resetZoom() {
    this.zoomLevel.set(1);
  }

  toggleBaloes() {
    this.exibirBaloesSempre.update(v => !v);
  }

  selectPin(id: number) {
    this.selectedLocalId.update(curr => curr === id ? null : id);
  }

  onMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    const el = this.viewportElement?.nativeElement;
    if (!el) return;

    this.isDragging = true;
    this.startX = e.pageX - el.offsetLeft;
    this.startY = e.pageY - el.offsetTop;
    this.scrollLeft = el.scrollLeft;
    this.scrollTop = el.scrollTop;
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    e.preventDefault();
    const el = this.viewportElement?.nativeElement;
    if (!el) return;

    const x = e.pageX - el.offsetLeft;
    const y = e.pageY - el.offsetTop;
    const walkX = (x - this.startX) * 1.2;
    const walkY = (y - this.startY) * 1.2;
    el.scrollLeft = this.scrollLeft - walkX;
    el.scrollTop = this.scrollTop - walkY;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    const el = this.viewportElement?.nativeElement;
    if (!el) return;

    this.isDragging = true;
    this.startX = e.touches[0].pageX - el.offsetLeft;
    this.startY = e.touches[0].pageY - el.offsetTop;
    this.scrollLeft = el.scrollLeft;
    this.scrollTop = el.scrollTop;
  }

  onTouchMove(e: TouchEvent) {
    if (!this.isDragging || e.touches.length !== 1) return;
    const el = this.viewportElement?.nativeElement;
    if (!el) return;

    const x = e.touches[0].pageX - el.offsetLeft;
    const y = e.touches[0].pageY - el.offsetTop;
    const walkX = (x - this.startX);
    const walkY = (y - this.startY);
    el.scrollLeft = this.scrollLeft - walkX;
    el.scrollTop = this.scrollTop - walkY;
  }

  onTouchEnd() {
    this.isDragging = false;
  }

  getTotalObreirosAlocados(): number {
    return this.postosCalculados().reduce((acc, p) => acc + p.nomesObreiros.length, 0);
  }

  getAlocadosCount(): number {
    return this.postosCalculados().filter(p => p.isAlocado).length;
  }

  /**
   * Renderiza imagem composta de alta resolução em HTML Canvas
   */
  private async renderizarMapaCanvas(): Promise<HTMLCanvasElement> {
    const area = this.currentArea();
    const ev = this.evento();
    const postos = this.postosCalculados();

    if (!area || !ev) {
      throw new Error('Área ou evento não selecionado.');
    }

    // Carrega a imagem do mapa se existir
    let imgElement: HTMLImageElement | null = null;
    if (area.mapa_url) {
      imgElement = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Falha ao carregar imagem do mapa.'));
        img.src = area.mapa_url!;
      });
    }

    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = imgElement ? Math.round((imgElement.height * width) / imgElement.width) : 700;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Fundo do Mapa
    if (imgElement) {
      ctx.drawImage(imgElement, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Mapa da Área não configurado', width / 2, height / 2);
      ctx.textAlign = 'left';
    }

    // 2. Desenhar Pinos e Nomes dos Obreiros
    for (const p of postos) {
      if (p.posicao_x !== null && p.posicao_y !== null) {
        const px = (p.posicao_x / 100) * width;
        const py = (p.posicao_y / 100) * height;

        // Círculo do Pino
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.fillStyle = p.isAlocado ? '#10b981' : '#475569';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Número do Pino
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.numero_posto), px, py);

        // Badge com Nome do Posto E Nomes dos Obreiros
        const textPosto = p.local.nome.toUpperCase();
        const listaObreiros = p.isAlocado ? p.nomesObreiros : ['[Posto Vago]'];

        ctx.font = 'bold 10px sans-serif';
        let maxTextWidth = ctx.measureText(textPosto).width;

        ctx.font = 'bold 13px sans-serif';
        for (const nome of listaObreiros) {
          const w = ctx.measureText(nome).width;
          if (w > maxTextWidth) maxTextWidth = w;
        }

        const textWidth = Math.max(maxTextWidth + 24, 110);
        const lineHeight = 16;
        const boxHeight = 22 + (listaObreiros.length * lineHeight);

        // Posição X com prevenção de overflow nas bordas laterais
        let boxX = px - textWidth / 2;
        if (boxX < 8) boxX = 8;
        if (boxX + textWidth > width - 8) boxX = width - 8 - textWidth;

        // Posição Y com base no cálculo anti-colisão e prevenção de bordas
        let boxY = p.posicaoBadge === 'top' || p.posicao_y > 60 
          ? (py - boxHeight - 24) 
          : (py + 24);

        if (boxY < 8) boxY = py + 24;
        if (boxY + boxHeight > height - 8) boxY = py - boxHeight - 24;

        // Fundo do balão (com sombra)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = p.isAlocado ? '#10b981' : '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, textWidth, boxHeight, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Linha 1: Nome do Posto
        const textCenterX = boxX + textWidth / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#38bdf8'; // Sky blue
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(textPosto, textCenterX, boxY + 14);

        // Linhas seguintes: Nomes dos Obreiros
        ctx.font = 'bold 12px sans-serif';
        listaObreiros.forEach((nome, idx) => {
          ctx.fillStyle = p.isAlocado ? '#ffffff' : '#94a3b8';
          ctx.fillText(p.isAlocado ? `👤 ${nome}` : nome, textCenterX, boxY + 30 + (idx * lineHeight));
        });
      }
    }

    return canvas;
  }

  async baixarImagem() {
    this.isGeneratingImage.set(true);
    try {
      const canvas = await this.renderizarMapaCanvas();
      const area = this.currentArea();
      const nomeArea = (area?.nome || 'area').toLowerCase().replace(/\s+/g, '-');
      const filename = `mapa-${nomeArea}-horario-${this.selectedHorario()}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.toast.success('Download Concluído', 'Imagem do mapa salva com sucesso.');
    } catch (err: any) {
      console.error('Erro ao baixar imagem:', err);
      this.toast.error('Erro', 'Falha ao gerar download da imagem.');
    } finally {
      this.isGeneratingImage.set(false);
    }
  }

  onClose() {
    this.close.emit();
  }
}
