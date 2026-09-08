import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { Evento } from '../models/evento.model';
import { Escala } from '../models/escala.model';
import { EventoAreaHorario, SaveAreaHorarioDto, TrajeAndLideresConfigDto } from '../models/evento-operacao.model';

@Injectable({
  providedIn: 'root'
})
export class EventoOperacaoService {
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);

  evento = signal<Evento | null>(null);
  escalas = signal<Escala[]>([]);
  areaHorarios = signal<EventoAreaHorario[]>([]);
  horariosSugeridos = signal<{ [key: string]: { hora_inicio: string; hora_fim: string } }>({});
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);

  async loadEventoOperacao(idEvento: number): Promise<void> {
    this.loading.set(true);
    try {
      // 1. Carrega o Evento
      const { data: evData, error: evError } = await this.supabase
        .from('eventos')
        .select('*, mes(*)')
        .eq('id_evento', idEvento)
        .single();

      if (evError) throw evError;
      this.evento.set(evData as Evento);

      // 2. Carrega as Escalas com Obreiro e Local (e Área do Local)
      const { data: escData, error: escError } = await this.supabase
        .from('escala')
        .select('*, obreiros(*), locais(*, areas(*))')
        .eq('id_evento', idEvento)
        .order('id_escala', { ascending: true });

      if (escError) throw escError;
      this.escalas.set((escData as Escala[]) || []);

      // 3. Carrega os Horários por Área configurados para o Evento
      const { data: ahData, error: ahError } = await this.supabase
        .from('evento_area_horarios')
        .select('*, areas(*)')
        .eq('id_evento', idEvento)
        .order('id_area', { ascending: true })
        .order('horario_turno', { ascending: true });

      if (ahError) throw ahError;
      this.areaHorarios.set((ahData as EventoAreaHorario[]) || []);

      // 4. Carrega os últimos horários configurados em eventos anteriores para pré-preenchimento
      const descAtual = (evData?.descricao || '').trim().toLowerCase();
      const dataAtual = evData?.data;
      const turnoAtual = evData?.turno;

      let query = this.supabase
        .from('evento_area_horarios')
        .select('id_area, horario_turno, hora_inicio, hora_fim, eventos!inner(id_evento, data, descricao, turno)')
        .neq('id_evento', idEvento);

      if (dataAtual) {
        query = query.lte('eventos.data', dataAtual);
      }

      const { data: ultimosData } = await query
        .order('id_area_horario', { ascending: false })
        .limit(200);

      const sugeridosMap: { [key: string]: { hora_inicio: string; hora_fim: string } } = {};

      if (ultimosData && ultimosData.length > 0) {
        // Prioridade 1: Mesmo tipo/descrição de evento
        for (const item of ultimosData as any[]) {
          const key = `${item.id_area}_${item.horario_turno}`;
          const evItemDesc = (item.eventos?.descricao || '').trim().toLowerCase();
          if (evItemDesc === descAtual && !sugeridosMap[key]) {
            sugeridosMap[key] = {
              hora_inicio: item.hora_inicio,
              hora_fim: item.hora_fim
            };
          }
        }

        // Prioridade 2: Mesmo turno
        for (const item of ultimosData as any[]) {
          const key = `${item.id_area}_${item.horario_turno}`;
          if (!sugeridosMap[key] && item.eventos?.turno === turnoAtual) {
            sugeridosMap[key] = {
              hora_inicio: item.hora_inicio,
              hora_fim: item.hora_fim
            };
          }
        }

        // Prioridade 3: Qualquer evento anterior mais recente
        for (const item of ultimosData as any[]) {
          const key = `${item.id_area}_${item.horario_turno}`;
          if (!sugeridosMap[key]) {
            sugeridosMap[key] = {
              hora_inicio: item.hora_inicio,
              hora_fim: item.hora_fim
            };
          }
        }
      }

      this.horariosSugeridos.set(sugeridosMap);

    } catch (err: any) {
      console.error('Erro ao carregar dados operacionais do evento:', err);
      this.toast.error('Erro', 'Não foi possível carregar as informações do culto.');
    } finally {
      this.loading.set(false);
    }
  }

  async saveTrajeAndLideres(idEvento: number, config: TrajeAndLideresConfigDto): Promise<boolean> {
    this.saving.set(true);
    try {
      const { data, error } = await this.supabase
        .from('eventos')
        .update({
          traje_tipo: config.traje_tipo,
          terno_cor_obrigatoria: config.terno_cor_obrigatoria,
          terno_cor: config.terno_cor_obrigatoria ? (config.terno_cor || null) : null,
          gravata_cor_obrigatoria: config.gravata_cor_obrigatoria,
          gravata_cor: config.gravata_cor_obrigatoria ? (config.gravata_cor || null) : null,
          camisa_cor_obrigatoria: config.camisa_cor_obrigatoria,
          camisa_cor: config.camisa_cor_obrigatoria ? (config.camisa_cor || null) : null,
          cracha_obrigatorio: config.cracha_obrigatorio,
          lideres_responsaveis_ids: config.lideres_responsaveis_ids
        })
        .eq('id_evento', idEvento)
        .select('*, mes(*)')
        .single();

      if (error) throw error;

      this.evento.set(data as Evento);
      this.toast.success('Salvo', 'Uniforme, crachá e liderança atualizados com sucesso!');
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar traje e liderança:', err);
      this.toast.error('Erro', err.message || 'Falha ao salvar configurações do culto.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async saveAreaHorario(idEvento: number, dto: SaveAreaHorarioDto): Promise<EventoAreaHorario | null> {
    this.saving.set(true);
    try {
      const { data, error } = await this.supabase
        .from('evento_area_horarios')
        .upsert([{
          id_evento: idEvento,
          id_area: dto.id_area,
          horario_turno: dto.horario_turno,
          hora_inicio: dto.hora_inicio,
          hora_fim: dto.hora_fim
        }], { onConflict: 'id_evento,id_area,horario_turno' })
        .select('*, areas(*)')
        .single();

      if (error) throw error;

      const saved = data as EventoAreaHorario;
      this.areaHorarios.update(prev => {
        const filtered = prev.filter(h => !(h.id_area === dto.id_area && h.horario_turno === dto.horario_turno));
        return [...filtered, saved].sort((a, b) => a.id_area - b.id_area || a.horario_turno - b.horario_turno);
      });

      this.toast.success('Horário Salvo', `Horário configurado com sucesso!`);
      return saved;
    } catch (err: any) {
      console.error('Erro ao salvar horário da área:', err);
      this.toast.error('Erro', err.message || 'Falha ao salvar horário da área.');
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  async saveAreaHorariosBatch(idEvento: number, dtos: SaveAreaHorarioDto[]): Promise<boolean> {
    if (!dtos.length) return true;
    this.saving.set(true);
    try {
      const records = dtos.map(dto => ({
        id_evento: idEvento,
        id_area: dto.id_area,
        horario_turno: dto.horario_turno,
        hora_inicio: dto.hora_inicio,
        hora_fim: dto.hora_fim
      }));

      const { error } = await this.supabase
        .from('evento_area_horarios')
        .upsert(records, { onConflict: 'id_evento,id_area,horario_turno' });

      if (error) throw error;

      // Recarrega todos os horários do evento
      const { data: ahData, error: ahError } = await this.supabase
        .from('evento_area_horarios')
        .select('*, areas(*)')
        .eq('id_evento', idEvento)
        .order('id_area', { ascending: true })
        .order('horario_turno', { ascending: true });

      if (!ahError && ahData) {
        this.areaHorarios.set(ahData as EventoAreaHorario[]);
      }

      this.toast.success('Horários Atualizados', `${dtos.length} horário(s) configurado(s) com sucesso!`);
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar lote de horários:', err);
      this.toast.error('Erro ao Salvar', err.message || 'Falha ao salvar horários por setor.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async deleteAreaHorario(idAreaHorario: number): Promise<boolean> {
    this.saving.set(true);
    try {
      const { error } = await this.supabase
        .from('evento_area_horarios')
        .delete()
        .eq('id_area_horario', idAreaHorario);

      if (error) throw error;

      this.areaHorarios.update(prev => prev.filter(h => h.id_area_horario !== idAreaHorario));
      this.toast.info('Removido', 'Horário de atuação removido desta área.');
      return true;
    } catch (err: any) {
      console.error('Erro ao remover horário da área:', err);
      this.toast.error('Erro', 'Não foi possível remover o horário.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async designarPosto(idEscala: number, idLocal: number | null, horarioTurno: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('escala')
        .update({
          id_local: idLocal,
          horario_turno: horarioTurno
        })
        .eq('id_escala', idEscala)
        .select('*, obreiros(*), locais(*, areas(*))')
        .single();

      if (error) throw error;

      const updated = data as Escala;
      this.escalas.update(prev => prev.map(e => e.id_escala === idEscala ? updated : e));
      this.toast.success('Posto Designado', `${updated.obreiros?.nome || 'Obreiro'} alocado com sucesso!`);
      return true;
    } catch (err: any) {
      console.error('Erro ao designar posto:', err);
      this.toast.error('Erro', 'Falha ao salvar designação do obreiro.');
      return false;
    }
  }

  async desvincularPosto(idEscala: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('escala')
        .update({
          id_local: null
        })
        .eq('id_escala', idEscala)
        .select('*, obreiros(*), locais(*, areas(*))')
        .single();

      if (error) throw error;

      const updated = data as Escala;
      this.escalas.update(prev => prev.map(e => e.id_escala === idEscala ? updated : e));
      this.toast.info('Posto Desvinculado', 'Obreiro desvinculado do posto.');
      return true;
    } catch (err: any) {
      console.error('Erro ao desvincular posto:', err);
      this.toast.error('Erro', 'Falha ao desvincular posto.');
      return false;
    }
  }

  async updateAreasVinculadas(idEvento: number, areasIds: number[]): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('eventos')
        .update({
          areas_ids: areasIds
        })
        .eq('id_evento', idEvento)
        .select('*, mes(*)')
        .single();

      if (error) throw error;

      this.evento.set(data as Evento);
      this.toast.success('Setores Atualizados', 'Áreas vinculadas ao culto salvas com sucesso.');
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar áreas vinculadas:', err);
      this.toast.error('Erro', 'Falha ao atualizar setores do culto.');
      return false;
    }
  }
}
