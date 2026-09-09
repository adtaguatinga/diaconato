import{Dn as mv,bt as W,cn as gv,i as A,pr as yo}from"./chunk-CgKaMffu.js";var p=class l{supabase=A(gv).client;toast=A(mv);escalas=yo([]);taxasPresencaTipoMap=yo(new Map);loading=yo(!1);mesCache=new Map;async fetchAllPaginated(r){let t=[],a=0,s=1e3;for(;;){let{data:e,error:o}=await r(a,a+s-1);if(o)throw o;if(!e||e.length===0||(t=t.concat(e),e.length<s))break;a+=s}return t}async fetchTaxasPresencaPorTipoEvento(r){let t=r||new Date().getFullYear();try{let a=new Map;try{let e=await this.fetchAllPaginated((o,i)=>this.supabase.from(`vw_distribuicao_obreiros_por_descricao_evento`).select(`*`).eq(`ano_referencia`,t).range(o,i));if(e&&e.length>0){for(let o of e){let i=`${o.id_obreiro}_${(o.descricao_evento||``).trim().toLowerCase()}`,n=a.get(i)||{total:0,presencas:0,faltas:0,pendentes:0,pct:null};n.total+=Number(o.total_escalas_no_ano||0),n.presencas+=Number(o.total_presencas||0),n.faltas+=Number(o.total_faltas||0),n.pendentes+=Number(o.total_pendentes||0);let h=n.presencas+n.faltas;n.pct=h>0?Math.round(n.presencas/h*100):null,a.set(i,n)}return this.taxasPresencaTipoMap.set(a),a}}catch(e){console.warn(`View vw_distribuicao_obreiros_por_descricao_evento não disponível, usando fallback:`,e)}let s=await this.fetchAllPaginated((e,o)=>this.supabase.from(`escala`).select(`
            id_obreiro,
            checkin,
            eventos!inner(descricao, data)
          `).gte(`eventos.data`,`${t}-01-01`).lte(`eventos.data`,`${t}-12-31`).range(e,o));if(s&&s.length>0){for(let e of s){if(!e.id_obreiro||!e.eventos?.descricao)continue;let o=`${e.id_obreiro}_${(e.eventos.descricao||``).trim().toLowerCase()}`,i=a.get(o)||{total:0,presencas:0,faltas:0,pendentes:0,pct:null};i.total++,e.checkin===!0?i.presencas++:e.checkin===!1?i.faltas++:i.pendentes++;let n=i.presencas+i.faltas;i.pct=n>0?Math.round(i.presencas/n*100):null,a.set(o,i)}return this.taxasPresencaTipoMap.set(a),a}return this.taxasPresencaTipoMap.set(a),a}catch(a){return console.error(`Erro ao buscar taxas de presença por tipo de evento:`,a),new Map}}async fetchByMes(r,t=!1){if(!t&&this.mesCache.has(r)){let a=this.mesCache.get(r);return this.escalas.set(a),a}this.loading.set(!0);try{let a=await this.fetchAllPaginated((s,e)=>this.supabase.from(`escala`).select(`
            *,
            eventos (*),
            obreiros (*),
            mes (*)
          `).eq(`id_mes`,r).order(`id_escala`,{ascending:!0}).range(s,e));return this.mesCache.set(r,a),this.escalas.set(a),a}catch(a){return console.error(`Erro ao buscar escala do mês:`,a),this.toast.error(`Erro ao carregar escala`,a.message),[]}finally{this.loading.set(!1)}}async fetchAll(){this.loading.set(!0);try{let r=[],t=0,a=1e3,s=!0;for(;s;){let{data:o,error:i}=await this.supabase.from(`escala`).select(`
            *,
            eventos (*),
            obreiros (*),
            mes (*)
          `).order(`id_escala`,{ascending:!0}).range(t,t+a-1);if(i)throw i;o&&o.length>0?(r.push(...o),o.length<a?s=!1:t+=a):s=!1}let e=new Map;for(let o of r)o.id_mes&&(e.has(o.id_mes)||e.set(o.id_mes,[]),e.get(o.id_mes).push(o));for(let[o,i]of e.entries())this.mesCache.set(o,i);return this.escalas.set(r),r}catch(r){return console.error(`Erro ao buscar todas as escalas:`,r),this.toast.error(`Erro ao carregar escalas`,r.message),[]}finally{this.loading.set(!1)}}async addObreiroToEvento(r){this.loading.set(!0);try{let{data:t,error:a}=await this.supabase.from(`escala`).insert([r]).select(`
          *,
          eventos (*),
          obreiros (*),
          mes (*)
        `).single();if(a){if(a.code===`23505`)return this.toast.warning(`Obreiro já escalado`,`Este obreiro já faz parte da escala deste evento.`),null;throw a}let s=t;return this.escalas.update(e=>[...e,s]),s.id_mes&&this.mesCache.has(s.id_mes)&&this.mesCache.set(s.id_mes,[...this.mesCache.get(s.id_mes),s]),this.toast.success(`Obreiro escalado!`,`Inclusão na escala realizada com sucesso.`),s}catch(t){return console.error(`Erro ao escalar obreiro:`,t),this.toast.error(`Falha ao adicionar na escala`,t.message),null}finally{this.loading.set(!1)}}async addMultipleObreirosToEvento(r){if(!r||r.length===0)return[];this.loading.set(!0);try{let{data:t,error:a}=await this.supabase.from(`escala`).insert(r).select(`
          *,
          eventos (*),
          obreiros (*),
          mes (*)
        `);if(a)if(a.code===`23505`)this.toast.warning(`Atenção`,`Um ou mais obreiros selecionados já estavam escalados neste evento.`);else throw a;let s=t||[];if(s.length>0){this.escalas.update(o=>[...o,...s]);let e=r[0].id_mes;e&&this.mesCache.has(e)&&this.mesCache.set(e,[...this.mesCache.get(e)||[],...s]),this.toast.success(`Obreiros escalados!`,`${s.length} ${s.length===1?`obreiro foi adicionado`:`obreiros foram adicionados`} \xE0 escala.`)}return s}catch(t){return console.error(`Erro ao escalar múltiplos obreiros:`,t),this.toast.error(`Erro ao escalar`,t.message||`Falha ao incluir obreiros na escala.`),[]}finally{this.loading.set(!1)}}async updateCheckin(r,t){try{let{data:a,error:s}=await this.supabase.from(`escala`).update({checkin:t}).eq(`id_escala`,r).select(`
          *,
          eventos (*),
          obreiros (*),
          mes (*)
        `).single();if(s)throw s;let e=a;this.escalas.update(i=>i.map(n=>n.id_escala===r?e:n)),e.id_mes&&this.mesCache.has(e.id_mes)&&this.mesCache.set(e.id_mes,this.mesCache.get(e.id_mes).map(i=>i.id_escala===r?e:i));let o=t===!0?`Presente ✅`:t===!1?`Ausente ❌`:`Pendente ⏳`;return this.toast.success(`Check-in atualizado`,`Status alterado para: ${o}`),e}catch(a){return console.error(`Erro ao atualizar check-in:`,a),this.toast.error(`Falha ao registrar check-in`,a.message),null}}async substituirObreiro(r,t){this.loading.set(!0);try{let{data:a,error:s}=await this.supabase.from(`escala`).update({id_obreiro:t,checkin:null}).eq(`id_escala`,r).select(`
          *,
          eventos (*),
          obreiros (*),
          mes (*)
        `).single();if(s){if(s.code===`23505`)return this.toast.warning(`Obreiro já escalado`,`Este obreiro substituto já faz parte da escala deste culto.`),null;throw s}let e=a;return this.escalas.update(o=>o.map(i=>i.id_escala===r?e:i)),e.id_mes&&this.mesCache.has(e.id_mes)&&this.mesCache.set(e.id_mes,this.mesCache.get(e.id_mes).map(o=>o.id_escala===r?e:o)),this.toast.success(`Substituição realizada!`,`Obreiro substitu\xEDdo com sucesso por ${e.obreiros?.nome}.`),e}catch(a){return console.error(`Erro ao substituir obreiro:`,a),this.toast.error(`Falha ao substituir obreiro`,a.message),null}finally{this.loading.set(!1)}}async saveGeneratedSchedule(r,t,a=!0){this.loading.set(!0);try{if(a){let{error:s}=await this.supabase.from(`escala`).delete().eq(`id_mes`,r);if(s)throw s}if(t.length>0){let{data:s,error:e}=await this.supabase.from(`escala`).insert(t).select(`
            *,
            eventos (*),
            obreiros (*),
            mes (*)
          `);if(e)throw e}return await this.fetchByMes(r,!0),this.toast.success(`Escala Mensal Gerada!`,`${t.length} escalas foram gravadas com sucesso.`),!0}catch(s){return console.error(`Erro ao salvar escala gerada:`,s),this.toast.error(`Falha ao salvar escala`,s.message),!1}finally{this.loading.set(!1)}}async removeObreiroFromEvento(r){this.loading.set(!0);try{let{error:t}=await this.supabase.from(`escala`).delete().eq(`id_escala`,r);if(t)throw t;return this.escalas.update(a=>a.filter(s=>s.id_escala!==r)),this.mesCache.clear(),this.toast.success(`Escala atualizada`,`Obreiro desescalado com sucesso.`),!0}catch(t){return console.error(`Erro ao remover da escala:`,t),this.toast.error(`Falha ao remover da escala`,t.message),!1}finally{this.loading.set(!1)}}static ɵfac=function(t){return new(t||l)};static ɵprov=W({token:l,factory:l.ɵfac,providedIn:`root`})};export{p as t};