import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { Area, CreateAreaDto, UpdateAreaDto } from '../models/area.model';

@Injectable({
  providedIn: 'root'
})
export class AreaService {
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);

  areas = signal<Area[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    this.fetchAreas();
  }

  async fetchAreas(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('areas')
        .select('*')
        .order('id_area', { ascending: true });

      if (error) throw error;
      this.areas.set((data as Area[]) || []);
    } catch (err: any) {
      console.error('Erro ao buscar áreas:', err);
      this.error.set(err.message || 'Erro ao carregar áreas');
      this.toast.error('Erro', 'Não foi possível carregar as áreas de atuação.');
    } finally {
      this.loading.set(false);
    }
  }

  async createArea(dto: CreateAreaDto): Promise<Area | null> {
    this.loading.set(true);
    try {
      const payload: any = {
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() || null,
        icone: dto.icone || '📍',
        ativo: dto.ativo ?? true
      };
      if (dto.mapa_url !== undefined) payload.mapa_url = dto.mapa_url;
      if (dto.mapa_nome !== undefined) payload.mapa_nome = dto.mapa_nome;

      let data: any = null;
      let error: any = null;

      try {
        const res = await this.supabase
          .from('areas')
          .insert([payload])
          .select()
          .single();
        data = res.data;
        error = res.error;
      } catch (e: any) {
        error = e;
      }

      // Se falhar por colunas mapa_url/mapa_nome inexistentes, tenta salvar sem elas e manter localmente
      if (error && (payload.mapa_url || payload.mapa_nome)) {
        const fallbackPayload = {
          nome: payload.nome,
          descricao: payload.descricao,
          icone: payload.icone,
          ativo: payload.ativo
        };
        const resFallback = await this.supabase
          .from('areas')
          .insert([fallbackPayload])
          .select()
          .single();
        if (resFallback.error) throw resFallback.error;
        data = {
          ...resFallback.data,
          mapa_url: payload.mapa_url,
          mapa_nome: payload.mapa_nome
        };
        error = null;
      } else if (error) {
        throw error;
      }

      const newArea = data as Area;
      this.areas.update(prev => [...prev, newArea].sort((a, b) => a.id_area - b.id_area));
      this.toast.success('Sucesso', `Área "${newArea.nome}" cadastrada com sucesso!`);
      return newArea;
    } catch (err: any) {
      console.error('Erro ao criar área:', err);
      this.toast.error('Erro', err.message || 'Falha ao cadastrar área.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateArea(id: number, dto: UpdateAreaDto): Promise<Area | null> {
    this.loading.set(true);
    try {
      const payload: any = {};
      if (dto.nome !== undefined) payload.nome = dto.nome.trim();
      if (dto.descricao !== undefined) payload.descricao = dto.descricao?.trim() || null;
      if (dto.icone !== undefined) payload.icone = dto.icone;
      if (dto.ativo !== undefined) payload.ativo = dto.ativo;
      if (dto.mapa_url !== undefined) payload.mapa_url = dto.mapa_url;
      if (dto.mapa_nome !== undefined) payload.mapa_nome = dto.mapa_nome;

      let data: any = null;
      let error: any = null;

      try {
        const res = await this.supabase
          .from('areas')
          .update(payload)
          .eq('id_area', id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      } catch (e: any) {
        error = e;
      }

      // Se falhar devido a coluna mapa_url inexistente no Supabase, tenta atualizar sem ela
      if (error && (payload.mapa_url !== undefined || payload.mapa_nome !== undefined)) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.mapa_url;
        delete fallbackPayload.mapa_nome;
        
        const resFallback = await this.supabase
          .from('areas')
          .update(fallbackPayload)
          .eq('id_area', id)
          .select()
          .single();
        
        if (resFallback.error) throw resFallback.error;
        data = {
          ...resFallback.data,
          mapa_url: payload.mapa_url,
          mapa_nome: payload.mapa_nome
        };
        error = null;
      } else if (error) {
        throw error;
      }

      const updated = data as Area;
      this.areas.update(prev => prev.map(item => item.id_area === id ? updated : item));
      this.toast.success('Atualizado', `Área "${updated.nome}" atualizada.`);
      return updated;
    } catch (err: any) {
      console.error('Erro ao atualizar área:', err);
      this.toast.error('Erro', err.message || 'Falha ao atualizar área.');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async deleteArea(id: number): Promise<boolean> {
    this.loading.set(true);
    try {
      const { error } = await this.supabase
        .from('areas')
        .delete()
        .eq('id_area', id);

      if (error) throw error;

      this.areas.update(prev => prev.filter(item => item.id_area !== id));
      this.toast.success('Excluído', 'Área removida com sucesso.');
      return true;
    } catch (err: any) {
      console.error('Erro ao excluir área:', err);
      this.toast.error('Erro', err.message || 'Falha ao excluir área.');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
