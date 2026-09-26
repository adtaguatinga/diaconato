import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ObreiroAuthService } from '../../core/services/obreiro-auth.service';
import { AuthService } from '../../core/services/auth.service';
import { PwaService } from '../../core/services/pwa.service';

export type LoginProfile = 'diacono' | 'lideranca';

@Component({
  selector: 'app-unified-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './unified-login.component.html'
})
export class UnifiedLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public obreiroAuth = inject(ObreiroAuthService);
  public authService = inject(AuthService);
  public pwaService = inject(PwaService);

  // Perfil padrão: 'diacono'
  activeProfile = signal<LoginProfile>('diacono');

  // Formulário Diácono / Obreiro
  diaconoForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    data_nascimento: ['', [
      Validators.required,
      Validators.pattern(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/)
    ]]
  });

  // Formulário Liderança / Administrativo
  liderancaForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    // Se a rota atual for /login (sem ser /portal/login) ou query param pedir lideranca
    const url = this.router.url;
    const tabParam = this.route.snapshot.queryParamMap.get('perfil');

    if (tabParam === 'lideranca' || url === '/login') {
      this.activeProfile.set('lideranca');
    } else {
      this.activeProfile.set('diacono');
    }
  }

  setProfile(profile: LoginProfile): void {
    this.activeProfile.set(profile);
  }

  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.substring(0, 8);

    let formatted = '';
    if (v.length <= 2) {
      formatted = v;
    } else if (v.length <= 4) {
      formatted = `${v.substring(0, 2)}/${v.substring(2)}`;
    } else {
      formatted = `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
    }

    input.value = formatted;
    this.diaconoForm.get('data_nascimento')?.setValue(formatted);
    this.diaconoForm.get('data_nascimento')?.markAsDirty();
  }

  async onDiaconoSubmit(): Promise<void> {
    if (this.diaconoForm.invalid) {
      this.diaconoForm.markAllAsTouched();
      return;
    }

    const { email, data_nascimento } = this.diaconoForm.value;
    await this.obreiroAuth.login(email, data_nascimento);
  }

  async onLiderancaSubmit(): Promise<void> {
    if (this.liderancaForm.invalid) {
      this.liderancaForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.liderancaForm.value;
    await this.authService.login(email, password);
  }
}
