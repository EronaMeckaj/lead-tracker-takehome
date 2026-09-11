import { Routes } from '@angular/router';
import { authGuard } from './auth/auth-guard';
import { Dashboard } from './dashboard/dashboard';
import { Login } from './login/login';
import { PublicForm } from './public-form/public-form';

export const routes: Routes = [
  { path: '', component: PublicForm },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
];
