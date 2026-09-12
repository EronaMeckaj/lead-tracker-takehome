import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Auth, CurrentUser } from './auth';
import { guestGuard } from './guest-guard';

describe('guestGuard', () => {
  let auth: { fetchCurrentUser: ReturnType<typeof vi.fn> };
  let router: Router;

  const runGuard = () =>
    TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never)) as Observable<
      boolean | ReturnType<Router['createUrlTree']>
    >;

  beforeEach(() => {
    auth = { fetchCurrentUser: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  it('allows activation when no session is present', async () => {
    auth.fetchCurrentUser.mockReturnValue(of(null));

    const result = await new Promise((resolve) => runGuard().subscribe(resolve));

    expect(result).toBe(true);
  });

  it('redirects an already-authenticated user to the dashboard', async () => {
    const user: CurrentUser = { id: '1', email: 'ada@example.com', name: 'Ada', avatarUrl: null };
    auth.fetchCurrentUser.mockReturnValue(of(user));

    const result = await new Promise((resolve) => runGuard().subscribe(resolve));

    expect(router.serializeUrl(result as never)).toBe('/dashboard');
  });
});
