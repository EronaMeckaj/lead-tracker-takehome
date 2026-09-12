import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Auth } from './auth/auth';

@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly router = inject(Router);
  protected readonly auth = inject(Auth);

  private readonly url = toSignal(
    this.router.events.pipe(
      takeUntilDestroyed(),
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** The login screen is a full-viewport split takeover with no chrome. */
  protected readonly showNav = computed(() => !this.url().startsWith('/login'));

  /** No point linking to the page you're already on. */
  protected readonly onDashboard = computed(() => this.url().startsWith('/dashboard'));

  ngOnInit(): void {
    // Populates the nav's auth state on every page, not just the
    // dashboard (which already checks this itself via authGuard).
    this.auth.fetchCurrentUser().subscribe();
  }

  signOut(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
