import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { PublicForm } from './public-form';

describe('PublicForm', () => {
  let fixture: ComponentFixture<PublicForm>;
  let component: PublicForm;
  let httpMock: HttpTestingController;

  const validValues = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'Interested in a demo',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(PublicForm);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does not submit an invalid form', () => {
    component.submit();

    httpMock.expectNone(`${environment.apiUrl}/leads`);
    expect(component['form'].touched).toBe(true);
  });

  it('posts the form value and shows a success state', () => {
    component['form'].setValue(validValues);

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/leads`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(validValues);
    req.flush({ id: '1', ...validValues, stage: 'new', source: 'form' });

    expect(component['status']()).toBe('success');
    expect(component['sentName']()).toBe('Ada');
    expect(component['form'].value.name).toBeFalsy();
  });

  it('shows a friendly message when rate-limited', () => {
    component['form'].setValue(validValues);
    component.submit();

    httpMock
      .expectOne(`${environment.apiUrl}/leads`)
      .flush(null, { status: 429, statusText: 'Too Many Requests' });

    expect(component['status']()).toBe('error');
    expect(component['errorMessage']()).toContain('too quickly');
  });

  it('shows a generic message for other failures', () => {
    component['form'].setValue(validValues);
    component.submit();

    httpMock
      .expectOne(`${environment.apiUrl}/leads`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(component['status']()).toBe('error');
    expect(component['errorMessage']()).toContain('Something went wrong');
  });

  it('resetForm returns to the idle state', () => {
    component['status'].set('success');

    component.resetForm();

    expect(component['status']()).toBe('idle');
  });
});
