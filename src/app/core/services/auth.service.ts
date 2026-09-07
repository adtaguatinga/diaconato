import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { Usuario, UserRole } from '../models/usuario.model';
import { User, Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private router = inject(Router);
  private toast = inject(ToastService);

  currentUser = signal<User | null>(null);
  currentProfile = signal<Usuario | null>(null);
  session = signal<Session | null>(null);
  loading = signal<boolean>(true);

  isAuthenticated = computed(() => !!this.currentUser());
  userRole = computed<UserRole>(() => this.currentProfile()?.role || 'operator');

  // Role Checks
  isAdmin = computed(() => this.userRole() === 'admin');
  isManager = computed(() => this.userRole() === 'manager');
  isOperator = computed(() => this.userRole() === 'operator');

  // Specific Permission Helpers
  canManageAll = computed(() => this.isAdmin());
  canManageEscalas = computed(() => this.isAdmin() || this.isManager());
  canManageBloqueios = computed(() => this.isAdmin() || this.isManager());
  canManageObreiros = computed(() => this.isAdmin() || this.isManager());
  canManageOperacao = computed(() => this.isAdmin() || this.isManager());
  canCheckin = computed(() => this.isAdmin() || this.isManager() || this.isOperator());
  canViewReports = computed(() => this.isAdmin() || this.isManager() || this.isOperator());
  canViewObreiros = computed(() => this.isAdmin() || this.isManager() || this.isOperator());
  canViewBloqueios = computed(() => this.isAdmin() || this.isManager() || this.isOperator());
  canManagePadroesBloqueio = computed(() => this.isAdmin());

  hasRole(allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(this.userRole());
  }

  constructor() {
    this.initAuth();
  }

  async initAuth(): Promise<boolean> {
    this.loading.set(true);
    try {
      const { data } = await this.supabase.auth.getSession();
      this.session.set(data.session);
      this.currentUser.set(data.session?.user ?? null);

      if (data.session?.user) {
        await this.loadUserProfile(data.session.user.id);
      }

      this.supabase.auth.onAuthStateChange(async (event, session) => {
        this.session.set(session);
        this.currentUser.set(session?.user ?? null);

        if (session?.user) {
          await this.loadUserProfile(session.user.id);
        } else {
          this.currentProfile.set(null);
        }
      });

      return !!data.session?.user;
    } catch (err) {
      console.error('Erro ao inicializar autenticação:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async loadUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao carregar perfil do usuário do Supabase:', error);
        return;
      }
      console.log('✅ Perfil carregado do Supabase:', data);
      this.currentProfile.set(data as Usuario);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Encerra qualquer sessão do portal do obreiro para garantir exclusividade
      localStorage.removeItem('diaconato_obreiro_session');

      this.session.set(data.session);
      this.currentUser.set(data.user);
      if (data.user) {
        await this.loadUserProfile(data.user.id);
      }

      this.toast.success('Bem-vindo!', 'Login efetuado com sucesso.');
      this.router.navigate(['/']);
      return true;
    } catch (err: any) {
      console.error('Erro no login:', err);
      let msg = err.message || 'Falha ao autenticar';
      if (msg.includes('Invalid login credentials')) {
        msg = 'E-mail ou senha incorretos.';
      }
      this.toast.error('Erro ao entrar', msg);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async register(email: string, password: string, nomeCompleto: string): Promise<boolean> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // Criar registro na tabela usuarios
        try {
          const { error: profileError } = await this.supabase
            .from('usuarios')
            .insert([
              {
                user_id: data.user.id,
                nome_completo: nomeCompleto
              }
            ]);
          if (profileError) console.warn('Erro ao registrar perfil:', profileError);
        } catch (e) {
          console.error(e);
        }

        this.currentUser.set(data.user);
        this.session.set(data.session);
        await this.loadUserProfile(data.user.id);
      }

      this.toast.success('Conta criada!', 'Seu cadastro foi realizado com sucesso.');
      this.router.navigate(['/']);
      return true;
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      this.toast.error('Falha ao cadastrar', err.message || 'Não foi possível criar a conta');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.loading.set(true);
    try {
      await this.supabase.auth.signOut();
      this.session.set(null);
      this.currentUser.set(null);
      this.currentProfile.set(null);
      this.toast.info('Sessão encerrada', 'Você saiu do sistema.');
      this.router.navigate(['/login']);
    } catch (err: any) {
      console.error('Erro ao deslogar:', err);
      this.toast.error('Erro ao sair', err.message);
    } finally {
      this.loading.set(false);
    }
  }
}