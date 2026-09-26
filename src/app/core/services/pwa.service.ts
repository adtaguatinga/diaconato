import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private swUpdate = inject(SwUpdate, { optional: true });
  private toastService = inject(ToastService);

  private deferredPrompt: any = null;

  // Signals
  canInstall = signal<boolean>(false);
  isInstalled = signal<boolean>(false);
  isIOS = signal<boolean>(false);
  isStandalone = signal<boolean>(false);
  isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  hasUpdate = signal<boolean>(false);
  showIosInstallGuide = signal<boolean>(false);

  constructor() {
    this.initPwa();
    this.initNetworkMonitoring();
    this.initUpdateChecker();
  }

  private initPwa() {
    if (typeof window === 'undefined') return;

    // Detect standalone mode (already installed & opened as app)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.isStandalone.set(isStandaloneMode);
    if (isStandaloneMode) {
      this.isInstalled.set(true);
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    this.isIOS.set(isIosDevice);

    // Listen for the beforeinstallprompt event (Chromium browsers)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.toastService.success('Aplicativo instalado com sucesso!', 'Você pode abrir o Diaconato direto da sua tela inicial.');
    });
  }

  private initNetworkMonitoring() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.toastService.success('Conexão restabelecida', 'Você está conectado à internet.');
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.toastService.warning('Sem conexão', 'Verifique sua conexão com a internet para carregar e atualizar dados.');
    });
  }

  private initUpdateChecker() {
    if (!this.swUpdate || !this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.hasUpdate.set(true);
        this.toastService.info('Nova versão disponível', 'Clique para atualizar o aplicativo.');
      });
  }

  async promptInstall(): Promise<boolean> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.canInstall.set(false);
      return outcome === 'accepted';
    }

    if (this.isIOS() && !this.isStandalone()) {
      this.showIosInstallGuide.set(true);
      return false;
    }

    return false;
  }

  openIosGuide() {
    this.showIosInstallGuide.set(true);
  }

  closeIosGuide() {
    this.showIosInstallGuide.set(false);
  }

  updateApp() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
