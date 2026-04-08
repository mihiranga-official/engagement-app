import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  authService = inject(AuthService);
  
  guestName: string = '';
  isLoggingIn: boolean = false;

  async loginGoogle() {
    this.isLoggingIn = true;
    try {
      await this.authService.loginWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoggingIn = false;
    }
  }

  async loginGuest() {
    console.log('loginGuest called with name:', this.guestName);
    if (!this.guestName.trim()) {
      console.log('Guest name is empty, returning');
      return;
    }
    this.isLoggingIn = true;
    console.log('Starting guest login process...');
    try {
      await this.authService.loginAsGuest(this.guestName);
      console.log('Guest login successful');
    } catch (e) {
      console.error('Guest login error:', e);
    } finally {
      this.isLoggingIn = false;
      console.log('Guest login process finished');
    }
  }
}
