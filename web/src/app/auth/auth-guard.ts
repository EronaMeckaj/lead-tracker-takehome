import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Auth } from './auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth
    .fetchCurrentUser()
    .pipe(map((user) => (user ? true : router.createUrlTree(['/login']))));
};
