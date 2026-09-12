import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '../auth/auth';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Auth, useValue: { loginUrl: () => 'https://api.example.com/auth/google' } }],
    });
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });

  it('points the Google sign-in link at the API auth endpoint', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href]');
    expect(link.getAttribute('href')).toBe('https://api.example.com/auth/google');
  });
});
