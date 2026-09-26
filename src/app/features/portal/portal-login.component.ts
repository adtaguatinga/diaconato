import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ObreiroAuthService } from '../../core/services/obreiro-auth.service';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-portal-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './portal-login.component.html'
})
export class PortalLoginComponent {
  private fb = inject(FormBuilder);
  public obreiroAuth = inject(ObreiroAuthService);
  public pwaService = inject(PwaService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    data_nascimento: ['', [
      Validators.required,
      Validators.pattern(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/)
    ]]
  });

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
    this.form.get('data_nascimento')?.setValue(formatted);
    this.form.get('data_nascimento')?.markAsDirty();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, data_nascimento } = this.form.value;
    await this.obreiroAuth.login(email, data_nascimento);
  }
}
