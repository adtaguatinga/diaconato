import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';

/**
 * Guarda que protege as rotas administrativas.
 * Se houver sessão de obreiro ativa, redireciona para o /portal (não permite ambos simultâneos).
 * Se não houver sessão administrativa, redireciona para /login.
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const supabase = inject(SupabaseService).client;
  const router = inject(Router);

  // 1. Se estiver logado como Obreiro, bloqueia o acesso administrativo e manda para o portal
  const obreiroSession = localStorage.getItem('diaconato_obreiro_session');
  if (obreiroSession) {
    try {
      const parsed = JSON.parse(obreiroSession);
      if (parsed?.id_obreiro) {
        return router.createUrlTree(['/portal']);
      }
    } catch (_) {}
  }

  // 2. Verifica a sessão de usuário administrativo no Supabase
  const { data } = await supabase.auth.getSession();
  const hasUser = !!data.session?.user;

  if (hasUser) {
    if (!authService.currentUser()) {
      authService.currentUser.set(data.session!.user);
      authService.session.set(data.session);
      authService.loadUserProfile(data.session!.user.id);
    }
    return true;
  }

  // Se estiver acessando a raiz e não tiver sessão, redireciona para a tela inicial padrão do Diácono
  if (state.url === '/' || state.url === '') {
    return router.createUrlTree(['/portal/login']);
  }

  // Redireciona para o login administrativo caso não esteja autenticado em rota específica
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

/**
 * Guarda para a página de login administrativo (/login).
 * Redireciona para / se já estiver autenticado como admin, ou para /portal se estiver logado como obreiro.
 */
export const guestGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService).client;
  const router = inject(Router);

  // Se estiver logado como Obreiro, manda para /portal
  const obreiroSession = localStorage.getItem('diaconato_obreiro_session');
  if (obreiroSession) {
    try {
      const parsed = JSON.parse(obreiroSession);
      if (parsed?.id_obreiro) {
        return router.createUrlTree(['/portal']);
      }
    } catch (_) {}
  }

  // Se estiver logado como Admin, manda para o painel administrativo /
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    return router.createUrlTree(['/']);
  }

  return true;
};