import { Routes } from '@angular/router';
import { Login } from './login/login';
import { PublicForm } from './public-form/public-form';

export const routes: Routes = [
  { path: '', component: PublicForm },
  { path: 'login', component: Login },
];
