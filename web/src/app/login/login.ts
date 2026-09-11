import { Component, inject } from '@angular/core';
import { Auth } from '../auth/auth';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  protected readonly loginUrl = this.auth.loginUrl();
}
