import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast with a message', () => {
    service.show('Ada Lovelace → Contacted');

    expect(service.toasts()).toEqual([
      expect.objectContaining({ message: 'Ada Lovelace → Contacted' }),
    ]);
  });

  it('auto-dismisses a toast after the timeout', () => {
    service.show('Ada Lovelace → Contacted');

    vi.advanceTimersByTime(5000);

    expect(service.toasts()).toEqual([]);
  });

  it('runAction invokes onAction and dismisses the toast', () => {
    const onAction = vi.fn();
    service.show('Ada Lovelace → Contacted', { actionLabel: 'Undo', onAction });

    service.runAction(service.toasts()[0]);

    expect(onAction).toHaveBeenCalledOnce();
    expect(service.toasts()).toEqual([]);
  });

  it('dismiss removes only the matching toast', () => {
    service.show('First');
    service.show('Second');
    const [first] = service.toasts();

    service.dismiss(first.id);

    expect(service.toasts()).toEqual([expect.objectContaining({ message: 'Second' })]);
  });
});
