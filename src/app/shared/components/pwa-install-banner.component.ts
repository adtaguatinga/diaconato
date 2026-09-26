import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-banner.component.html'
})
export class PwaInstallBannerComponent {
  pwaService = inject(PwaService);

  dismissed = signal<boolean>(false);

  constructor() {
    if (typeof sessionStorage !== 'undefined') {
      const isDismissed = sessionStorage.getItem('diaconato_pwa_banner_dismissed') === 'true';
      this.dismissed.set(isDismissed);
    }
  }

  shouldShow(): boolean {
    if (this.dismissed()) return false;
    if (this.pwaService.isStandalone()) return false;
    return this.pwaService.canInstall() || this.pwaService.isIOS();
  }

  install(): void {
    this.pwaService.promptInstall();
    this.dismiss();
  }

  dismiss(): void {
    this.dismissed.set(true);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('diaconato_pwa_banner_dismissed', 'true');
    }
  }
}
