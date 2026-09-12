import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Auth } from './auth';

/** Keeps an already-authenticated user off /login - bounces them to the dashboard instead. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth
    .fetchCurrentUser()
    .pipe(map((user) => (user ? router.createUrlTree(['/dashboard']) : true)));
};
