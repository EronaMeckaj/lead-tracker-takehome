import { Component, OnInit, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './auth/auth';
import { ThemeToggle } from './theme/theme-toggle';

@Component({
  imports: [RouterOutlet, RouterLink, MatToolbar, MatButton, ThemeToggle],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly router = inject(Router);
  protected readonly auth = inject(Auth);

  ngOnInit(): void {
    // Populates the nav's auth state on every page, not just the
    // dashboard (which already checks this itself via authGuard).
    this.auth.fetchCurrentUser().subscribe();
  }

  signOut(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
