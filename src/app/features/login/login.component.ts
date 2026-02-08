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
        error: (err) => this.errorMessage = err.error || 'Error al iniciar sesion'
      });
    } else {
      this.authService.register(this.username, this.email, this.password).subscribe({
        next: () => this.router.navigate(['/waiting-room']),
        error: (err) => this.errorMessage = err.error || 'Error al registrarse'
      });
    }
  }
}
