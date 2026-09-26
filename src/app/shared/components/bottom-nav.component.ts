import { Component, inject, signal, computed } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ObreiroAuthService } from '../../core/services/obreiro-auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './bottom-nav.component.html'
})
export class BottomNavComponent {
  authService = inject(AuthService);
  obreiroAuth = inject(ObreiroAuthService);
  private router = inject(Router);

  currentUrl = signal<string>(this.router.url);

  isPortalRoute = computed(() => {
    const url = this.currentUrl();
    return url.startsWith('/portal') || (this.obreiroAuth.isAuthenticated() && !this.authService.isAuthenticated());
  });

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      this.currentUrl.set(e.urlAfterRedirects || e.url);
    });
  }
}