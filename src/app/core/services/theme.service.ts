import { Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'diaconato_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<AppTheme>('dark');
  isDark = signal<boolean>(true);

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    const initialTheme: AppTheme = savedTheme === 'light' ? 'light' : 'dark';
    
    this.theme.set(initialTheme);
    this.isDark.set(initialTheme === 'dark');
    this.applyTheme(initialTheme);
  }

  toggleTheme(): void {
    const nextTheme: AppTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    this.isDark.set(nextTheme === 'dark');
    this.applyTheme(nextTheme);
  }

  setTheme(newTheme: AppTheme): void {
    this.theme.set(newTheme);
    this.isDark.set(newTheme === 'dark');
    this.applyTheme(newTheme);
  }

  private applyTheme(t: AppTheme): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      this.updateMetaThemeColor('#020617');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      this.updateMetaThemeColor('#ffffff');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch (_) {}
  }

  private updateMetaThemeColor(color: string): void {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', color);
    }
  }
}
