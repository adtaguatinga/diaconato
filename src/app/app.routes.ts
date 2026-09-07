import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { obreiroGuard, obreiroGuestGuard } from './core/guards/obreiro.guard';

export const routes: Routes = [
  // ==========================================
  // 👥 PORTAL DO OBREIRO / DIÁCONO
  // ==========================================
  {
    path: 'portal/login',
    canActivate: [obreiroGuestGuard],
    loadComponent: () => import('./features/portal/portal-login.component').then(m => m.PortalLoginComponent)
  },
  {
    path: 'portal',
    canActivate: [obreiroGuard],
    loadComponent: () => import('./features/portal/portal-dashboard.component').then(m => m.PortalDashboardComponent)
  },
  {
    path: 'portal/escalas',
    canActivate: [obreiroGuard],
    loadComponent: () => import('./features/portal/portal-escalas.component').then(m => m.PortalEscalasComponent)
  },
  {
    path: 'portal/bloqueios',
    canActivate: [obreiroGuard],
    loadComponent: () => import('./features/portal/portal-bloqueios.component').then(m => m.PortalBloqueiosComponent)
  },
  {
    path: 'portal/contatos',
    canActivate: [obreiroGuard],
    loadComponent: () => import('./features/portal/portal-contatos.component').then(m => m.PortalContatosComponent)
  },

  // ==========================================
  // 🔐 ADMINISTRAÇÃO & OPERAÇÃO GERAL
  // ==========================================
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'obreiros',
    canActivate: [authGuard, roleGuard(['admin', 'manager', 'operator'])],
    loadComponent: () => import('./features/obreiros/obreiros-list.component').then(m => m.ObreirosListComponent)
  },
  {
    path: 'eventos/gerador',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/eventos/evento-gerador.component').then(m => m.EventoGeradorComponent)
  },
  {
    path: 'eventos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/eventos/eventos-list.component').then(m => m.EventosListComponent)
  },
  {
    path: 'tipos-evento',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/tipos-evento/tipos-evento-list.component').then(m => m.TiposEventoListComponent)
  },
  {
    path: 'bloqueios/padroes',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/bloqueios/padroes-bloqueio-list.component').then(m => m.PadroesBloqueioListComponent)
  },
  {
    path: 'bloqueios',
    canActivate: [authGuard, roleGuard(['admin', 'manager', 'operator'])],
    loadComponent: () => import('./features/bloqueios/bloqueios-list.component').then(m => m.BloqueiosListComponent)
  },
  {
    path: 'meses',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/meses/meses-list.component').then(m => m.MesesListComponent)
  },
  {
    path: 'escalas/gerador',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/escalas/escala-gerador.component').then(m => m.EscalaGeradorComponent)
  },
  {
    path: 'escalas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/escalas/escalas-list.component').then(m => m.EscalasListComponent)
  },
  {
    path: 'relatorios',
    canActivate: [authGuard, roleGuard(['admin', 'manager', 'operator'])],
    loadComponent: () => import('./features/relatorios/relatorios.component').then(m => m.RelatoriosComponent)
  },
  {
    path: 'locais',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/locais/locais-list.component').then(m => m.LocaisListComponent)
  },
  {
    path: 'eventos/:id/operacao',
    canActivate: [authGuard],
    loadComponent: () => import('./features/eventos/evento-detalhes.component').then(m => m.EventoDetalhesComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];