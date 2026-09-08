import { Component, ElementRef, HostListener, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ObreiroAuthService } from '../../core/services/obreiro-auth.service';
import { ROLE_LABELS, ROLE_BADGE_STYLES, UserRole } from '../../core/models/usuario.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  authService = inject(AuthService);
  obreiroAuth = inject(ObreiroAuthService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  isProfileMenuOpen = signal<boolean>(false);
  isConfigMenuOpen = signal<boolean>(false);

  isPortalRoute = computed(() => {
    const url = this.router.url;
    return url.startsWith('/portal') || (this.obreiroAuth.isAuthenticated() && !this.authService.isAuthenticated());
  });

  isConfigRoute = computed(() => {
    const url = this.router.url;
    return url.startsWith('/tipos-evento') || 
           url.startsWith('/locais') || 
           url.startsWith('/bloqueios/padroes') || 
           url.startsWith('/meses');
  });

  toggleProfileMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.isProfileMenuOpen.update(v => !v);
    this.isConfigMenuOpen.set(false);
  }

  closeProfileMenu() {
    this.isProfileMenuOpen.set(false);
  }

  toggleConfigMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.isConfigMenuOpen.update(v => !v);
    this.isProfileMenuOpen.set(false);
  }

  closeConfigMenu() {
    this.isConfigMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeProfileMenu();
      this.closeConfigMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeProfileMenu();
    this.closeConfigMenu();
  }

  getUserInitial(): string {
    if (this.isPortalRoute() && this.obreiroAuth.currentObreiro()) {
      return (this.obreiroAuth.currentObreiro()?.nome || 'O').charAt(0).toUpperCase();
    }
    const name = this.authService.currentProfile()?.nome_completo || this.authService.currentUser()?.email || 'U';
    return name.charAt(0).toUpperCase();
  }

  getFirstName(): string {
    if (this.isPortalRoute() && this.obreiroAuth.currentObreiro()) {
      const nome = this.obreiroAuth.currentObreiro()?.nome;
      return nome ? nome.split(' ')[0] : 'Obreiro';
    }
    const fullName = this.authService.currentProfile()?.nome_completo;
    if (fullName) {
      return fullName.split(' ')[0];
    }
    const email = this.authService.currentUser()?.email;
    return email ? email.split('@')[0] : 'Usuário';
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role] || 'Operador';
  }

  getRoleBadgeStyle(role: UserRole) {
    return ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES['operator'];
  }
}