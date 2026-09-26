import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/components/navbar.component';
import { BottomNavComponent } from './shared/components/bottom-nav.component';
import { ToastComponent } from './shared/components/toast.component';
import { PwaInstallModalComponent } from './shared/components/pwa-install-modal.component';
import { PwaInstallBannerComponent } from './shared/components/pwa-install-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NavbarComponent, 
    BottomNavComponent, 
    ToastComponent, 
    PwaInstallModalComponent,
    PwaInstallBannerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}

