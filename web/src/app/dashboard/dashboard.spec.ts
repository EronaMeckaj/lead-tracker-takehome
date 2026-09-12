import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Lead, Leads } from '../leads/leads';
import { ToastService } from '../shared/toast/toast';
import { Dashboard } from './dashboard';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'hi',
    stage: 'new',
    source: 'form',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
  let leadsApi: {
    list: ReturnType<typeof vi.fn>;
    updateStage: ReturnType<typeof vi.fn>;
    exportCsvUrl: ReturnType<typeof vi.fn>;
  };
  let toast: { show: ReturnType<typeof vi.fn> };

  function setup(leads: Lead[]): void {
    leadsApi = {
      list: vi.fn().mockReturnValue(of({ data: leads, total: leads.length, page: 1, limit: 100 })),
      updateStage: vi.fn(),
      exportCsvUrl: vi.fn().mockReturnValue('http://api.example.com/leads/export.csv'),
    };
    toast = { show: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Leads, useValue: leadsApi },
        { provide: ToastService, useValue: toast },
      ],
    });
    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads leads on init and groups them into board columns by stage', () => {
    setup([makeLead({ id: '1', stage: 'new' }), makeLead({ id: '2', stage: 'contacted' })]);

    expect(leadsApi.list).toHaveBeenCalledWith({ q: undefined, limit: 100 });
    expect(component['columns']().new).toHaveLength(1);
    expect(component['columns']().contacted).toHaveLength(1);
    expect(component['columns']().closed).toHaveLength(0);
  });

  it('refetches with the debounced search query', () => {
    vi.useFakeTimers();
    try {
      setup([makeLead()]);
      leadsApi.list.mockClear();

      component.onSearchInput({ target: { value: 'ada' } } as unknown as Event);
      vi.advanceTimersByTime(300);
      fixture.detectChanges();

      expect(leadsApi.list).toHaveBeenCalledWith({ q: 'ada', limit: 100 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('sorts leads by name', () => {
    setup([
      makeLead({ id: '1', name: 'Zoe', createdAt: '2024-01-02T00:00:00.000Z' }),
      makeLead({ id: '2', name: 'Ada', createdAt: '2024-01-01T00:00:00.000Z' }),
    ]);

    component.setSortBy('name');

    expect(component['sortedLeads']().map((lead) => lead.name)).toEqual(['Ada', 'Zoe']);
  });

  it('sorts leads oldest-first', () => {
    setup([
      makeLead({ id: '1', name: 'Newer', createdAt: '2024-01-02T00:00:00.000Z' }),
      makeLead({ id: '2', name: 'Older', createdAt: '2024-01-01T00:00:00.000Z' }),
    ]);

    component.setSortBy('oldest');

    expect(component['sortedLeads']().map((lead) => lead.name)).toEqual(['Older', 'Newer']);
  });

  it('paginates the list view at 20 rows per page', () => {
    const leads = Array.from({ length: 25 }, (_, i) => makeLead({ id: String(i), name: `Lead ${i}` }));
    setup(leads);

    expect(component['listTotalPages']()).toBe(2);
    expect(component['listRows']()).toHaveLength(20);

    component.goToListPage(2);

    expect(component['listRows']()).toHaveLength(5);
  });

  it('ignores out-of-range page requests', () => {
    setup([makeLead()]);

    component.goToListPage(0);
    expect(component['listPage']()).toBe(1);

    component.goToListPage(99);
    expect(component['listPage']()).toBe(1);
  });

  it('moves a lead optimistically and shows an undo toast on success', () => {
    setup([makeLead({ id: '1', stage: 'new' })]);
    leadsApi.updateStage.mockReturnValue(of(makeLead({ id: '1', stage: 'contacted' })));

    component['changeStage'](component['leads']()[0], 'contacted');

    expect(component['leads']()[0].stage).toBe('contacted');
    expect(leadsApi.updateStage).toHaveBeenCalledWith('1', 'contacted');
    expect(toast.show).toHaveBeenCalledWith(
      'Ada Lovelace → Contacted',
      expect.objectContaining({ actionLabel: 'Undo' }),
    );
  });

  it('rolls back and surfaces an error when the stage update fails', () => {
    setup([makeLead({ id: '1', stage: 'new' })]);
    leadsApi.updateStage.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    component['changeStage'](component['leads']()[0], 'contacted');

    expect(component['leads']()[0].stage).toBe('new');
    expect(component['error']()).toContain('Could not move');
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('undoes a move without showing a second toast', () => {
    setup([makeLead({ id: '1', stage: 'new' })]);
    leadsApi.updateStage.mockReturnValue(of(makeLead({ id: '1', stage: 'contacted' })));

    component['changeStage'](component['leads']()[0], 'contacted');
    const [, toastOptions] = toast.show.mock.calls[0];

    leadsApi.updateStage.mockReturnValue(of(makeLead({ id: '1', stage: 'new' })));
    toastOptions.onAction();

    expect(component['leads']()[0].stage).toBe('new');
    expect(toast.show).toHaveBeenCalledTimes(1);
  });

  it('does not persist a drop back into the same column', () => {
    setup([makeLead({ id: '1', stage: 'new' })]);
    const lead = component['leads']()[0];

    component.onDrop(
      { item: { data: lead } } as unknown as CdkDragDrop<Lead[], Lead[], Lead>,
      'new',
    );

    expect(leadsApi.updateStage).not.toHaveBeenCalled();
  });
});
