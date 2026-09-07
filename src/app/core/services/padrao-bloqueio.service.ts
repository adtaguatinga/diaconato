import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { BloqueioService } from './bloqueio.service';
import { 
  PadraoBloqueio, 
  CreatePadraoBloqueioDto, 
  UpdatePadraoBloqueioDto,
  formatarDescricaoRegra
} from '../models/padrao-bloqueio.model';
import { expandirTurnos } from '../models/turno.enum';
import { CreateBloqueioDto, Bloqueio } from '../models/bloqueio.model';

export interface PreviaBloqueioItem {
  id_obreiro: number;
  nome_obreiro: string;
  apelido_obreiro?: string | null;
  data: string; // 'YYYY-MM-DD'
  turno: number;
  motivo: string;
  regraOrigem: string;
  jaExiste: boolean;
}

export interface ResultadoPreviaGeracao {
  ano: number;
  mes: number;
  totalDiasNoMes: number;
  itens: PreviaBloqueioItem[];
  novosBloqueios: CreateBloqueioDto[];
  totalNovos: number;
  totalJaExistentes: number;
  obreirosImpactadosCount: number;
}

const LOCAL_STORAGE_KEY = 'diaconato_padroes_bloqueio_fallback';

@Injectable({
  providedIn: 'root'
})
export class PadraoBloqueioService {
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private bloqueioService = inject(BloqueioService);

  padroes = signal<PadraoBloqueio[]>([]);
  loading = signal<boolean>(false);

  // Fallback local se tabela ainda não existir no Supabase
  private useLocalStorageFallback = false;

  private loadFromLocalStorage(): PadraoBloqueio[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(list: PadraoBloqueio[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar padrões no localStorage:', e);
    }
  }

  async fetchAll(): Promise<PadraoBloqueio[]> {
    this.loading.set(true);
    try {
      const allData: PadraoBloqueio[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await this.supabase
          .from('padroes_bloqueio')
          .select(`
            *,
            obreiros (*)
          `)
          .order('id_padrao_bloqueio', { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          // Se tabela não existe ou erro de RLS, usa fallback gracioso
          console.warn('Supabase padroes_bloqueio indisponível, usando fallback local:', error.message);
          this.useLocalStorageFallback = true;
          const localList = this.loadFromLocalStorage();
          this.padroes.set(localList);
          return localList;
        }

        if (data && data.length > 0) {
          allData.push(...(data as PadraoBloqueio[]));
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            from += pageSize;
          }
        } else {
          hasMore = false;
        }
      }

      this.useLocalStorageFallback = false;
      this.padroes.set(allData);
      return allData;
    } catch (err: any) {
      console.warn('Erro ao buscar padroes_bloqueio, acionando fallback local:', err);
      this.useLocalStorageFallback = true;
      const localList = this.loadFromLocalStorage();
      this.padroes.set(localList);
      return localList;
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreatePadraoBloqueioDto): Promise<PadraoBloqueio | null> {
    this.loading.set(true);
    try {
      if (this.useLocalStorageFallback) {
        const localList = this.loadFromLocalStorage();
        const novo: PadraoBloqueio = {
          ...dto,
          id_padrao_bloqueio: Date.now(),
          criado_em: new Date().toISOString()
        };
        const updated = [novo, ...localList];
        this.saveToLocalStorage(updated);
        this.padroes.set(updated);
        this.toast.success('Padrão de bloqueio cadastrado!', 'Regra salva com sucesso.');
        return novo;
      }

      const { data, error } = await this.supabase
        .from('padroes_bloqueio')
        .insert(dto)
        .select(`
          *,
          obreiros (*)
        `)
        .single();

      if (error) {
        // Tenta fallback se tabela não existir
        this.useLocalStorageFallback = true;
        const localList = this.loadFromLocalStorage();
        const novo: PadraoBloqueio = {
          ...dto,
          id_padrao_bloqueio: Date.now(),
          criado_em: new Date().toISOString()
        };
        const updated = [novo, ...localList];
        this.saveToLocalStorage(updated);
        this.padroes.set(updated);
        this.toast.success('Padrão cadastrado com sucesso!');
        return novo;
      }

      const created = data as PadraoBloqueio;
      this.padroes.update(list => [created, ...list]);
      this.toast.success('Padrão de bloqueio cadastrado!', 'Regra de indisponibilidade criada.');
      return created;
    } catch (err: any) {
      console.error('Erro ao criar padrão de bloqueio:', err);
      this.toast.error('Erro ao cadastrar padrão', err.message);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async createMultiple(dtos: CreatePadraoBloqueioDto[]): Promise<PadraoBloqueio[]> {
    if (dtos.length === 0) return [];
    if (dtos.length === 1) {
      const res = await this.create(dtos[0]);
      return res ? [res] : [];
    }

    this.loading.set(true);
    try {
      if (this.useLocalStorageFallback) {
        const localList = this.loadFromLocalStorage();
        const novos: PadraoBloqueio[] = dtos.map((dto, idx) => ({
          ...dto,
          id_padrao_bloqueio: Date.now() + idx,
          criado_em: new Date().toISOString()
        }));
        const updated = [...novos, ...localList];
        this.saveToLocalStorage(updated);
        this.padroes.set(updated);
        this.toast.success(`${novos.length} padrões cadastrados!`, 'Regras salvas com sucesso.');
        return novos;
      }

      const { data, error } = await this.supabase
        .from('padroes_bloqueio')
        .insert(dtos)
        .select(`
          *,
          obreiros (*)
        `);

      if (error) {
        this.useLocalStorageFallback = true;
        const localList = this.loadFromLocalStorage();
        const novos: PadraoBloqueio[] = dtos.map((dto, idx) => ({
          ...dto,
          id_padrao_bloqueio: Date.now() + idx,
          criado_em: new Date().toISOString()
        }));
        const updated = [...novos, ...localList];
        this.saveToLocalStorage(updated);
        this.padroes.set(updated);
        this.toast.success(`${novos.length} padrões cadastrados!`);
        return novos;
      }

      const created = data as PadraoBloqueio[];
      this.padroes.update(list => [...created, ...list]);
      this.toast.success(`${created.length} padrões cadastrados!`, 'Regras de indisponibilidade criadas.');
      return created;
    } catch (err: any) {
      console.error('Erro ao criar padrões de bloqueio:', err);
      this.toast.error('Erro ao cadastrar padrões', err.message);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async update(id: number, dto: UpdatePadraoBloqueioDto): Promise<PadraoBloqueio | null> {
    this.loading.set(true);
    try {
      if (this.useLocalStorageFallback) {
        const localList = this.loadFromLocalStorage();
        const updatedList = localList.map(item => item.id_padrao_bloqueio === id ? { ...item, ...dto } : item);
        this.saveToLocalStorage(updatedList);
        this.padroes.set(updatedList);
        this.toast.success('Padrão atualizado!', 'Alterações salvas com sucesso.');
        return updatedList.find(i => i.id_padrao_bloqueio === id) || null;
      }

      const { data, error } = await this.supabase
        .from('padroes_bloqueio')
        .update({ ...dto, atualizado_em: new Date().toISOString() })
        .eq('id_padrao_bloqueio', id)
        .select(`
          *,
          obreiros (*)
        `)
        .single();

      if (error) throw error;
      const updated = data as PadraoBloqueio;
      this.padroes.update(list => list.map(item => item.id_padrao_bloqueio === id ? updated : item));
      this.toast.success('Padrão atualizado!', 'Regra atualizada com sucesso.');
      return updated;
    } catch (err: any) {
      console.error('Erro ao atualizar padrão de bloqueio:', err);
      this.toast.error('Erro ao salvar alterações', err.message);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async toggleAtivo(id: number, ativo: boolean): Promise<boolean> {
    const res = await this.update(id, { ativo });
    return !!res;
  }

  async delete(id: number): Promise<boolean> {
    this.loading.set(true);
    try {
      if (this.useLocalStorageFallback) {
        const localList = this.loadFromLocalStorage();
        const updatedList = localList.filter(item => item.id_padrao_bloqueio !== id);
        this.saveToLocalStorage(updatedList);
        this.padroes.set(updatedList);
        this.toast.success('Padrão excluído!', 'Regra removida com sucesso.');
        return true;
      }

      const { error } = await this.supabase
        .from('padroes_bloqueio')
        .delete()
        .eq('id_padrao_bloqueio', id);

      if (error) throw error;
      this.padroes.update(list => list.filter(item => item.id_padrao_bloqueio !== id));
      this.toast.success('Padrão removido', 'Regra excluída com sucesso.');
      return true;
    } catch (err: any) {
      console.error('Erro ao excluir padrão de bloqueio:', err);
      this.toast.error('Erro ao excluir padrão', err.message);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Avalia os padrões vigentes para um determinado mês e gera a prévia completa.
   */
  calcularPreviaParaMes(
    ano: number, 
    mes: number, 
    padroesParaAvaliar?: PadraoBloqueio[], 
    bloqueiosExistentes?: Bloqueio[]
  ): ResultadoPreviaGeracao {
    const listPadroes = (padroesParaAvaliar || this.padroes()).filter(p => p.ativo);
    const existingBloqueios = bloqueiosExistentes || this.bloqueioService.bloqueios();
    
    // Conjunto de chaves de bloqueios já existentes: "idObreiro_YYYY-MM-DD_turno"
    const existingKeySet = new Set(
      existingBloqueios.map(b => `${b.id_obreiro}_${b.data}_${b.turno}`)
    );

    const itens: PreviaBloqueioItem[] = [];
    const novosDtos: CreateBloqueioDto[] = [];
    const seenNewKeys = new Set<string>();

    // Quantidade de dias no mês
    const diasNoMes = new Date(ano, mes, 0).getDate();

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataObj = new Date(ano, mes - 1, dia);
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      
      // Dia da semana: 1=Dom, 2=Seg, ..., 7=Sáb
      const diaSemana = dataObj.getDay() + 1;
      
      // Semana ordinal do mês (1ª, 2ª, 3ª, 4ª ou 5ª)
      const semanaOrdinal = Math.ceil(dia / 7);

      // Avaliar cada padrão ativo
      for (const padrao of listPadroes) {
        // 1. Checar vigência
        if (padrao.data_inicio && dataStr < padrao.data_inicio) {
          continue;
        }
        if (padrao.data_fim && dataStr > padrao.data_fim) {
          continue;
        }

        // 2. Avaliar regra do padrão
        let match = false;

        switch (padrao.tipo_regra) {
          case 'dias_semana': {
            if (padrao.dias_semana && padrao.dias_semana.includes(diaSemana)) {
              match = true;
            }
            break;
          }

          case 'paridade': {
            const isPar = dia % 2 === 0;
            const paridadeMatch = (padrao.paridade === 'par' && isPar) || (padrao.paridade === 'impar' && !isPar);
            const diasSem = padrao.dias_semana || [];
            const diaSemMatch = diasSem.length === 0 || diasSem.includes(diaSemana);
            if (paridadeMatch && diaSemMatch) {
              match = true;
            }
            break;
          }

          case 'faixa_dias': {
            const ini = padrao.dia_inicio_mes || 1;
            const fim = padrao.dia_fim_mes || 31;
            const faixaMatch = dia >= ini && dia <= fim;
            const diasSem = padrao.dias_semana || [];
            const diaSemMatch = diasSem.length === 0 || diasSem.includes(diaSemana);
            if (faixaMatch && diaSemMatch) {
              match = true;
            }
            break;
          }

          case 'semanas_mes': {
            const semanas = padrao.semanas_mes || [];
            const diasSem = padrao.dias_semana || [];
            const semanaMatch = semanas.length === 0 || semanas.includes(semanaOrdinal);
            const diaSemMatch = diasSem.length === 0 || diasSem.includes(diaSemana);
            if (semanaMatch && diaSemMatch) {
              match = true;
            }
            break;
          }

          case 'dias_mes': {
            const diasMatch = padrao.dias_mes && padrao.dias_mes.includes(dia);
            const diasSem = padrao.dias_semana || [];
            const diaSemMatch = diasSem.length === 0 || diasSem.includes(diaSemana);
            if (diasMatch && diaSemMatch) {
              match = true;
            }
            break;
          }

          case 'escala_plantao': {
            const dataBaseStr = padrao.data_base_plantao || padrao.data_inicio;
            if (dataBaseStr) {
              const baseDate = new Date(dataBaseStr + 'T00:00:00');
              const targetDate = new Date(dataStr + 'T00:00:00');
              const diffTime = targetDate.getTime() - baseDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              const trab = padrao.dias_trabalho || 1;
              const folga = padrao.dias_folga || 1;
              const ciclo = trab + folga;

              if (diffDays >= 0) {
                const resto = diffDays % ciclo;
                if (resto < trab) {
                  const diasSem = padrao.dias_semana || [];
                  const diaSemMatch = diasSem.length === 0 || diasSem.includes(diaSemana);
                  if (diaSemMatch) {
                    match = true;
                  }
                }
              }
            }
            break;
          }
        }

        if (match) {
          const turnosBloquear = expandirTurnos(padrao.turno);

          for (const t of turnosBloquear) {
            const key = `${padrao.id_obreiro}_${dataStr}_${t}`;
            const jaExiste = existingKeySet.has(key);

            const item: PreviaBloqueioItem = {
              id_obreiro: padrao.id_obreiro,
              nome_obreiro: padrao.obreiros?.nome || `Obreiro #${padrao.id_obreiro}`,
              apelido_obreiro: padrao.obreiros?.apelido,
              data: dataStr,
              turno: t,
              motivo: padrao.motivo || formatarDescricaoRegra(padrao),
              regraOrigem: formatarDescricaoRegra(padrao),
              jaExiste
            };

            itens.push(item);

            if (!jaExiste && !seenNewKeys.has(key)) {
              seenNewKeys.add(key);
              novosDtos.push({
                id_obreiro: padrao.id_obreiro,
                data: dataStr,
                turno: t,
                motivo: item.motivo
              });
            }
          }
        }
      }
    }

    // Ordenar por data e nome
    itens.sort((a, b) => a.data.localeCompare(b.data) || a.nome_obreiro.localeCompare(b.nome_obreiro));

    const obreirosImpactados = new Set(itens.map(i => i.id_obreiro));

    return {
      ano,
      mes,
      totalDiasNoMes: diasNoMes,
      itens,
      novosBloqueios: novosDtos,
      totalNovos: novosDtos.length,
      totalJaExistentes: itens.filter(i => i.jaExiste).length,
      obreirosImpactadosCount: obreirosImpactados.size
    };
  }

  /**
   * Executa a geração em massa e insere os bloqueios no banco.
   * Se substituirExistentes for true, remove os bloqueios existentes no mês dos obreiros avaliados antes de recriar.
   */
  async gerarEInserirBloqueiosParaMes(
    ano: number, 
    mes: number, 
    padroesParaAvaliar?: PadraoBloqueio[],
    substituirExistentes: boolean = false
  ): Promise<{ criadosCount: number; ignoradosCount: number; substituidosCount?: number }> {
    const padroes = padroesParaAvaliar || this.padroes().filter(p => p.ativo !== false);
    const previa = this.calcularPreviaParaMes(ano, mes, padroes);

    if (substituirExistentes) {
      const mesStr = String(mes).padStart(2, '0');
      const prefix = `${ano}-${mesStr}`;
      
      const obreirosIdsComPadrao = new Set(padroes.map(p => p.id_obreiro));
      
      // Encontra todos os bloqueios existentes deste mês para esses obreiros
      const bloqueiosAtuais = this.bloqueioService.bloqueios();
      const bloqueiosParaRemover = bloqueiosAtuais.filter(b => 
        b.data && b.data.startsWith(prefix) && obreirosIdsComPadrao.has(b.id_obreiro)
      );
      
      const idsParaRemover = bloqueiosParaRemover
        .map(b => b.id_bloqueio)
        .filter((id): id is number => typeof id === 'number' && id > 0);

      if (idsParaRemover.length > 0) {
        await this.bloqueioService.deleteBatch(idsParaRemover);
      }

      // Preparar todos os itens únicos da prévia para inserção
      const seenKeys = new Set<string>();
      const dtosParaInserir: CreateBloqueioDto[] = [];
      for (const item of previa.itens) {
        const k = `${item.id_obreiro}_${item.data}_${item.turno}`;
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          dtosParaInserir.push({
            id_obreiro: item.id_obreiro,
            data: item.data,
            turno: item.turno,
            motivo: item.motivo
          });
        }
      }

      if (dtosParaInserir.length === 0) {
        this.toast.info('Nenhum bloqueio a gerar', 'Os padrões vigentes não geraram bloqueios para este mês.');
        return { criadosCount: 0, ignoradosCount: 0, substituidosCount: idsParaRemover.length };
      }

      const created = await this.bloqueioService.createBatch(dtosParaInserir);
      const count = created ? created.length : 0;

      return {
        criadosCount: count,
        ignoradosCount: 0,
        substituidosCount: idsParaRemover.length
      };
    } else {
      if (previa.novosBloqueios.length === 0) {
        this.toast.info('Nenhum novo bloqueio', 'Todos os bloqueios gerados pelos padrões já estavam cadastrados no sistema.');
        return { criadosCount: 0, ignoradosCount: previa.totalJaExistentes, substituidosCount: 0 };
      }

      const created = await this.bloqueioService.createBatch(previa.novosBloqueios);
      const count = created ? created.length : 0;

      return {
        criadosCount: count,
        ignoradosCount: previa.totalJaExistentes,
        substituidosCount: 0
      };
    }
  }
}
