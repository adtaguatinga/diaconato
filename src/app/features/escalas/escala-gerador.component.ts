import { Component, OnInit, ChangeDetectorRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AutoEscalaService, AutoEscalaResult } from '../../core/services/auto-escala.service';
import { EscalaService } from '../../core/services/escala.service';
import { EventoService } from '../../core/services/evento.service';
import { ObreiroService } from '../../core/services/obreiro.service';
import { MesService } from '../../core/services/mes.service';
import { BloqueioService } from '../../core/services/bloqueio.service';
import { RelatorioService } from '../../core/services/relatorio.service';
import { ToastService } from '../../core/services/toast.service';
import { formatMesReferencia, findCurrentMes } from '../../core/models/mes.model';
import { DistribuicaoObreiroEvento } from '../../core/models/relatorios.model';
import { TURNO_LABELS, TURNO_COLORS } from '../../core/models/turno.enum';

@Component({
  selector: 'app-escala-gerador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './escala-gerador.component.html'
})
export class EscalaGeradorComponent implements OnInit {
  autoEscalaService = inject(AutoEscalaService);
  escalaService = inject(EscalaService);
  eventoService = inject(EventoService);
  obreiroService = inject(ObreiroService);
  mesService = inject(MesService);
  bloqueioService = inject(BloqueioService);
  relatorioService = inject(RelatorioService);
  toast = inject(ToastService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  formatMesReferencia = formatMesReferencia;

  selectedMesId = signal<number>(0);
  replaceExisting = true;
  equilibrarPorTipoEventoAnual = false;
  isGenerating = false;
  isSaving = false;

  result = signal<AutoEscalaResult | null>(null);

  ngOnInit() {
    this.carregarDados();
  }

  async carregarDados() {
    const [meses] = await Promise.all([
      this.mesService.fetchAll(),
      this.eventoService.fetchAll(),
      this.obreiroService.fetchAll(),
      this.bloqueioService.fetchAll(),
      this.escalaService.fetchAll()
    ]);

    if (this.selectedMesId() === 0) {
      const cur = findCurrentMes(meses);
      if (cur && cur.id_mes) {
        this.selectedMesId.set(cur.id_mes);
      }
    }
    this.cdr.detectChanges();
  }

  onMesChange(mesId: number) {
    this.selectedMesId.set(Number(mesId));
    this.result.set(null);
    this.cdr.detectChanges();
  }

  getEventosCountDoMes(): number {
    const mesId = Number(this.selectedMesId());
    if (!mesId) return 0;
    return this.eventoService.eventos().filter(e => Number(e.id_mes) === mesId).length;
  }

  getObreirosElegiveisCount(): number {
    return this.obreiroService.obreiros().filter(o => o.ativo && !o.lider).length;
  }

  getDiaconosCount(): number {
    return this.obreiroService.obreiros().filter(o => o.ativo && !o.lider && o.diacono).length;
  }

  getPulpitoCount(): number {
    return this.obreiroService.obreiros().filter(o => o.ativo && !o.lider && o.pulpito).length;
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

  private getObreirosParticipantes(): any[] {
    const res = this.result();
    if (!res || !res.obreiroStats) return [];
    return res.obreiroStats.filter(s => s.totalEscalas > 0);
  }

  getMediaEscalas(): string {
    const participantes = this.getObreirosParticipantes();
    if (participantes.length === 0) return '0';
    const total = participantes.reduce((acc, s) => acc + s.totalEscalas, 0);
    return (total / participantes.length).toFixed(1);
  }

  getMinEscalas(): number {
    const participantes = this.getObreirosParticipantes();
    if (participantes.length === 0) return 0;
    return Math.min(...participantes.map(s => s.totalEscalas));
  }

  getMaxEscalas(): number {
    const participantes = this.getObreirosParticipantes();
    if (participantes.length === 0) return 0;
    return Math.max(...participantes.map(s => s.totalEscalas));
  }

  async executarGeracaoAutomatica() {
    const mesId = Number(this.selectedMesId());
    if (!mesId) {
      this.toast.warning('Selecione um mês', 'Por favor, selecione um mês de referência para gerar a escala.');
      return;
    }

    this.isGenerating = true;
    this.cdr.detectChanges();

    try {
      let distribuicaoAnual: DistribuicaoObreiroEvento[] = [];
      if (this.equilibrarPorTipoEventoAnual) {
        const mes = this.mesService.meses().find(m => m.id_mes === mesId);
        const ano = mes?.ano_referencia || new Date().getFullYear();
        distribuicaoAnual = await this.relatorioService.fetchDistribuicaoEventos(ano);
      }

      const generated = this.autoEscalaService.generateMonthlySchedule(
        mesId,
        this.eventoService.eventos(),
        this.obreiroService.obreiros(),
        this.bloqueioService.bloqueios(),
        this.escalaService.escalas(),
        this.replaceExisting,
        this.equilibrarPorTipoEventoAnual,
        distribuicaoAnual
      );

      this.result.set(generated);

      if (generated.totalVagasNecessarias === 0) {
        this.toast.warning('Sem cultos', 'Nenhum culto cadastrado para este mês. Use "Gerar Cultos do Mês" para criá-los.');
      } else if (generated.totalVagasPreenchidas === generated.totalVagasNecessarias) {
        this.toast.success('Escala calculada!', `100% das vagas (${generated.totalVagasPreenchidas}) foram preenchidas com sucesso.`);
      } else {
        this.toast.warning('Escala com vagas abertas', `${generated.totalVagasPreenchidas} de ${generated.totalVagasNecessarias} vagas foram preenchidas.`);
      }
    } catch (err: any) {
      console.error('Erro na execução da geração automática:', err);
      this.toast.error('Erro ao processar regras', err.message || 'Ocorreu um erro inesperado.');
    } finally {
      this.isGenerating = false;
      this.cdr.detectChanges();
    }
  }

  async salvarEscalaNoBanco() {
    const res = this.result();
    if (!res || res.dtos.length === 0) return;
    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      const success = await this.escalaService.saveGeneratedSchedule(
        res.id_mes,
        res.dtos,
        this.replaceExisting
      );

      if (success) {
        this.router.navigate(['/escalas'], { queryParams: { mes: res.id_mes } });
      }
    } catch (err: any) {
      console.error('Erro ao salvar escala no banco:', err);
      this.toast.error('Erro ao salvar', err.message);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }
}