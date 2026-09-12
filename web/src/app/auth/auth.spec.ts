import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Auth, CurrentUser } from './auth';

describe('Auth', () => {
  let auth: Auth;
  let httpMock: HttpTestingController;

  const user: CurrentUser = { id: '1', email: 'ada@example.com', name: 'Ada', avatarUrl: null };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts unauthenticated', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
  });

  it('sets the current user when the session resolves', () => {
    auth.fetchCurrentUser().subscribe();

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(user);

    expect(auth.currentUser()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('clears the current user when the session check fails', () => {
    auth.fetchCurrentUser().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(user);
    expect(auth.isAuthenticated()).toBe(true);

    auth.fetchCurrentUser().subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.currentUser()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('builds the Google login URL from the API origin', () => {
    expect(auth.loginUrl()).toBe(`${environment.apiUrl}/auth/google`);
  });

  it('clears the current user on logout', () => {
    auth.fetchCurrentUser().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush(user);

    auth.logout().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush({ success: true });

    expect(auth.currentUser()).toBeNull();
  });
});
