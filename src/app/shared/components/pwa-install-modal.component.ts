import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-modal.component.html'
})
export class PwaInstallModalComponent {
  pwaService = inject(PwaService);

  close() {
    this.pwaService.closeIosGuide();
  }
}
