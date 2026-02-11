import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoginMode = true;
  username = '';
  email = '';
  password = '';
  errorMessage = '';

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.isLoginMode) {
      this.authService.login(this.username, this.password).subscribe({
        next: () => this.router.navigate(['/waiting-room']),
        error: (err) => this.errorMessage = this.parseError(err, 'Error al iniciar sesion')
      });
    } else {
      this.authService.register(this.username, this.email, this.password).subscribe({
        next: () => this.router.navigate(['/waiting-room']),
        error: (err) => this.errorMessage = this.parseError(err, 'Error al registrarse')
      });
    }
  }

  private parseError(err: any, fallback: string): string {
    const body = err.error;
    if (!body) return fallback;
    if (typeof body === 'string') return body;
    if (body.errors) {
      const messages = Object.values(body.errors).flat();
      return messages.join('. ');
    }
    if (body.title) return body.title;
    return fallback;
  }
}
