import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { Local, CreateLocalDto, UpdateLocalDto } from '../models/local.model';

@Injectable({
  providedIn: 'root'
})
export class LocalService {
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);

  locais = signal<Local[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    this.fetchLocais();
  }

  async fetchLocais(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('locais')
        .select('*, areas(*)')
        .order('id_area', { ascending: true })
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      this.locais.set((data as Local[]) || []);
    } catch (err: any) {
      console.error('Erro ao buscar locais:', err);
      this.error.set(err.message || 'Erro ao carregar locais');
      this.toast.error('Erro', 'Não foi possível carregar os locais de atuação.');
    } finally {
      this.loading.set(false);
    }
  }

  async createLocal(dto: CreateLocalDto): Promise<Local | null> {
    this.loading.set(true);
    try {
      const payload: any = {
        id_area: dto.id_area,
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() || null,
        ordem: dto.ordem ?? 0,
        ativo: dto.ativo ?? true
      };
      if (dto.posicao_x !== undefined) payload.posicao_x = dto.posicao_x;
      if (dto.posicao_y !== undefined) payload.posicao_y = dto.posicao_y;
      if (dto.numero_posto !== undefined) payload.numero_posto = dto.numero_posto;
      if (dto.cor_pino !== undefined) payload.cor_pino = dto.cor_pino;
      if (dto.icone_pino !== undefined) payload.icone_pino = dto.icone_pino;

      let data: any = null;
      let error: any = null;

      try {
        const res = await this.supabase
          .from('locais')
          .insert([payload])
          .select('*, areas(*)')
          .single();
        data = res.data;
        error = res.error;
      } catch (e: any) {
        error = e;
      }

      // Fallback caso colunas de posição não existam no Supabase
      if (error && (payload.posicao_x !== undefined || payload.numero_posto !== undefined)) {
        const fallbackPayload = {
          id_area: payload.id_area,
          nome: payload.nome,
          descricao: payload.descricao,
          ordem: payload.ordem,
          ativo: payload.ativo
        };
        const resFallback = await this.supabase
          .from('locais')
          .insert([fallbackPayload])
          .select('*, areas(*)')
          .single();
        if (resFallback.error) throw resFallback.error;
        data = {
          ...resFallback.data,
          posicao_x: payload.posicao_x,
          posicao_y: payload.posicao_y,
          numero_posto: payload.numero_posto,
          cor_pino: payload.cor_pino,
          icone_pino: payload.icone_pino
        };
        error = null;
      } else if (error) {
        throw error;
      }

      const newLocal = data as Local;
      this.locais.update(prev => [...prev, newLocal]);
      this.toast.success('Sucesso', `Local "${newLocal.nome}" cadastrado com sucesso!`);
      return newLocal;
    } catch (err: any) {
      console.error('Erro ao criar local:', err);
      this.toast.error('Erro', err.message || 'Falha ao cadastrar local.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateLocal(id: number, dto: UpdateLocalDto): Promise<Local | null> {
    this.loading.set(true);
    try {
      const payload: any = {};
      if (dto.id_area !== undefined) payload.id_area = dto.id_area;
      if (dto.nome !== undefined) payload.nome = dto.nome.trim();
      if (dto.descricao !== undefined) payload.descricao = dto.descricao?.trim() || null;
      if (dto.ordem !== undefined) payload.ordem = dto.ordem;
      if (dto.ativo !== undefined) payload.ativo = dto.ativo;
      if (dto.posicao_x !== undefined) payload.posicao_x = dto.posicao_x;
      if (dto.posicao_y !== undefined) payload.posicao_y = dto.posicao_y;
      if (dto.numero_posto !== undefined) payload.numero_posto = dto.numero_posto;
      if (dto.cor_pino !== undefined) payload.cor_pino = dto.cor_pino;
      if (dto.icone_pino !== undefined) payload.icone_pino = dto.icone_pino;

      let data: any = null;
      let error: any = null;

      try {
        const res = await this.supabase
          .from('locais')
          .update(payload)
          .eq('id_local', id)
          .select('*, areas(*)')
          .single();
        data = res.data;
        error = res.error;
      } catch (e: any) {
        error = e;
      }

      // Fallback se colunas de posição não existirem no Supabase
      if (error && (payload.posicao_x !== undefined || payload.numero_posto !== undefined)) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.posicao_x;
        delete fallbackPayload.posicao_y;
        delete fallbackPayload.numero_posto;
        delete fallbackPayload.cor_pino;
        delete fallbackPayload.icone_pino;

        const resFallback = await this.supabase
          .from('locais')
          .update(fallbackPayload)
          .eq('id_local', id)
          .select('*, areas(*)')
          .single();
        if (resFallback.error) throw resFallback.error;
        data = {
          ...resFallback.data,
          posicao_x: payload.posicao_x,
          posicao_y: payload.posicao_y,
          numero_posto: payload.numero_posto,
          cor_pino: payload.cor_pino,
          icone_pino: payload.icone_pino
        };
        error = null;
      } else if (error) {
        throw error;
      }

      const updated = data as Local;
      this.locais.update(prev => prev.map(item => item.id_local === id ? updated : item));
      this.toast.success('Atualizado', `Local "${updated.nome}" atualizado.`);
      return updated;
    } catch (err: any) {
      console.error('Erro ao atualizar local:', err);
      this.toast.error('Erro', err.message || 'Falha ao atualizar local.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateCoordenadasBatch(atualizacoes: { id_local: number; posicao_x?: number | null; posicao_y?: number | null; numero_posto?: number | null }[]): Promise<boolean> {
    if (atualizacoes.length === 0) return true;
    this.loading.set(true);
    try {
      for (const item of atualizacoes) {
        await this.updateLocal(item.id_local, {
          posicao_x: item.posicao_x,
          posicao_y: item.posicao_y,
          numero_posto: item.numero_posto
        });
      }
      this.toast.success('Mapa Salvo', 'Posicionamento dos postos atualizado com sucesso!');
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar coordenadas em lote:', err);
      this.toast.error('Erro', 'Falha ao salvar posições dos postos no mapa.');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async toggleAtivo(local: Local): Promise<void> {
    const novoStatus = !local.ativo;
    try {
      const { error } = await this.supabase
        .from('locais')
        .update({ ativo: novoStatus })
        .eq('id_local', local.id_local);

      if (error) throw error;

      this.locais.update(prev =>
        prev.map(item => item.id_local === local.id_local ? { ...item, ativo: novoStatus } : item)
      );
      this.toast.info('Status Alterado', `Local marcado como ${novoStatus ? 'Ativo' : 'Inativo'}.`);
    } catch (err: any) {
      console.error('Erro ao alterar status do local:', err);
      this.toast.error('Erro', 'Não foi possível alterar o status do local.');
    }
  }

  async deleteLocal(id: number): Promise<boolean> {
    this.loading.set(true);
    try {
      const { error } = await this.supabase
        .from('locais')
        .delete()
        .eq('id_local', id);

      if (error) throw error;

      this.locais.update(prev => prev.filter(item => item.id_local !== id));
      this.toast.success('Excluído', 'Local removido com sucesso.');
      return true;
    } catch (err: any) {
      console.error('Erro ao excluir local:', err);
      this.toast.error('Erro', err.message || 'Falha ao excluir local.');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
