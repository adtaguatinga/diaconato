import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EventoService } from '../../core/services/evento.service';
import { TipoEventoService } from '../../core/services/tipo-evento.service';
import { MesService } from '../../core/services/mes.service';
import { ToastService } from '../../core/services/toast.service';
import { CreateEventoDto } from '../../core/models/evento.model';
import { TipoEvento, DIAS_SEMANA_LABELS } from '../../core/models/tipo-evento.model';
import { formatMesReferencia, findCurrentMes } from '../../core/models/mes.model';
import { TURNO_LABELS, TURNO_COLORS } from '../../core/models/turno.enum';

@Component({
  selector: 'app-evento-gerador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './evento-gerador.component.html'
})
export class EventoGeradorComponent implements OnInit {
  eventoService = inject(EventoService);
  tipoEventoService = inject(TipoEventoService);
  mesService = inject(MesService);
  toast = inject(ToastService);
  router = inject(Router);

  formatMesReferencia = formatMesReferencia;
  DIAS_SEMANA_LABELS = DIAS_SEMANA_LABELS;

  selectedMesId = signal<number>(0);
  replaceExisting = true;
  isGenerating = false;
  isSaving = false;

  selectedTiposIds = signal<Set<number>>(new Set());
  generatedEvents: CreateEventoDto[] = [];

  ngOnInit() {
    this.carregarDados();
  }

  async carregarDados() {
    const [meses] = await Promise.all([
      this.mesService.fetchAll(),
      this.tipoEventoService.fetchAll(),
      this.eventoService.fetchAll()
    ]);

    // Pré-selecionar o mês atual
    if (this.selectedMesId() === 0) {
      const cur = findCurrentMes(meses);
      if (cur && cur.id_mes) {
        this.selectedMesId.set(cur.id_mes);
      }
    }

    // Selecionar todos os modelos com dia fixo por padrão
    this.selecionarTodosModelos(true);
  }

  onMesChange(mesId: number) {
    this.selectedMesId.set(Number(mesId));
    this.generatedEvents = [];
  }

  getModelosComDiaFixo(): TipoEvento[] {
    return this.tipoEventoService.tiposEvento().filter(t => 
      t.dia_semana_padrao && Number(t.dia_semana_padrao) >= 1 && Number(t.dia_semana_padrao) <= 7
    );
  }

  isTipoSelected(id?: number | null): boolean {
    if (!id) return false;
    return this.selectedTiposIds().has(Number(id));
  }

  selecionarTodosModelos(select: boolean) {
    if (select) {
      const ids = this.getModelosComDiaFixo()
        .map(t => Number(t.id_tipo_evento))
        .filter(id => !isNaN(id) && id > 0);
      this.selectedTiposIds.set(new Set(ids));
    } else {
      this.selectedTiposIds.set(new Set());
    }
  }

  toggleTipo(id?: number | null) {
    if (!id) return;
    const numId = Number(id);
    this.selectedTiposIds.update(prev => {
      const next = new Set(prev);
      if (next.has(numId)) {
        next.delete(numId);
      } else {
        next.add(numId);
      }
      return next;
    });
  }

  getDiaSemanaNome(dia?: number | null): string {
    if (!dia) return 'Sem dia fixo';
    return DIAS_SEMANA_LABELS[Number(dia)] || 'Dia ' + dia;
  }

  getTurnoLabel(turno: number): string {
    return TURNO_LABELS[Number(turno)] || 'Geral';
  }

  getTurnoStyle(turno: number) {
    return TURNO_COLORS[Number(turno)] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  }

  getDiaSemanaFromData(dataStr: string): string {
    const parts = dataStr.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = date.getDay() + 1; // 1: Domingo, 7: Sábado
    return DIAS_SEMANA_LABELS[dayOfWeek] || '';
  }

  gerarPreviaEventos() {
    const mesId = Number(this.selectedMesId());
    if (!mesId) {
      this.toast.warning('Selecione um mês', 'Por favor, selecione um mês de referência.');
      return;
    }

    const mes = this.mesService.meses().find(m => Number(m.id_mes) === mesId);
    if (!mes) {
      this.toast.error('Erro', 'Mês de referência não encontrado.');
      return;
    }

    const modelosSelecionados = this.getModelosComDiaFixo().filter(t => 
      this.isTipoSelected(t.id_tipo_evento)
    );

    if (modelosSelecionados.length === 0) {
      this.toast.warning('Nenhum modelo selecionado', 'Selecione ao menos um modelo de culto para gerar as datas.');
      return;
    }

    try {
      const year = Number(mes.ano_referencia);
      const month = Number(mes.mes_referencia); // 1 a 12

      // Total de dias no mês
      const daysInMonth = new Date(year, month, 0).getDate();

      const eventsList: CreateEventoDto[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay() + 1; // 1 = Domingo, 2 = Segunda, ..., 7 = Sábado

        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        const dateFormatted = `${year}-${monthStr}-${dayStr}`;

        // Buscar modelos que coincidem com este dia da semana
        const matchingModels = modelosSelecionados.filter(t => Number(t.dia_semana_padrao) === dayOfWeek);

        for (const modelo of matchingModels) {
          eventsList.push({
            id_mes: mesId,
            data: dateFormatted,
            descricao: modelo.descricao_padrao,
            turno: Number(modelo.turno_padrao),
            n_primeiro_horario: Number(modelo.n_primeiro_horario_padrao) || 0,
            exclusivo_diacono_primeiro: !!modelo.exclusivo_diacono_primeiro_padrao,
            n_segundo_horario: Number(modelo.n_segundo_horario_padrao) || 0,
            exclusivo_diacono_segundo: !!modelo.exclusivo_diacono_segundo_padrao,
            n_terceiro_horario: Number(modelo.n_terceiro_horario_padrao) || 0,
            exclusivo_diacono_terceiro: !!modelo.exclusivo_diacono_terceiro_padrao,
            pulpito_primeiro: !!modelo.pulpito_primeiro,
            pulpito_segundo: !!modelo.pulpito_segundo,
            pulpito_terceiro: !!modelo.pulpito_terceiro,
            areas_ids: modelo.areas_ids || []
          });
        }
      }

      // Ordenar cronologicamente por data e turno
      eventsList.sort((a, b) => {
        const cmp = a.data.localeCompare(b.data);
        if (cmp !== 0) return cmp;
        return a.turno - b.turno;
      });

      this.generatedEvents = eventsList;
      this.toast.success('Calendário Calculado!', `${eventsList.length} cultos foram gerados na pré-visualização.`);
    } catch (err: any) {
      console.error('Erro ao calcular datas:', err);
      this.toast.error('Erro ao calcular datas', err.message);
    }
  }

  removerEventoPrevia(index: number) {
    this.generatedEvents.splice(index, 1);
  }

  async salvarNoBanco() {
    if (this.generatedEvents.length === 0) return;
    const mesId = Number(this.selectedMesId());
    if (!mesId) return;

    this.isSaving = true;
    try {
      const success = await this.eventoService.saveGeneratedEvents(
        mesId,
        this.generatedEvents,
        this.replaceExisting
      );

      if (success) {
        this.router.navigate(['/eventos'], { queryParams: { mes: mesId } });
      }
    } catch (err: any) {
      console.error('Erro ao salvar eventos no banco:', err);
      this.toast.error('Erro ao salvar', err.message);
    } finally {
      this.isSaving = false;
    }
  }
}