import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, Signal, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { Lead, LeadStage, Leads } from '../leads/leads';
import { AppSelect, SelectOption } from '../shared/select/select';
import { ToastService } from '../shared/toast/toast';
import { TimeAgoPipe } from './time-ago';

const STAGES: LeadStage[] = ['new', 'contacted', 'closed'];
const SORT_OPTIONS = ['recent', 'oldest', 'name'] as const;
type SortBy = (typeof SORT_OPTIONS)[number];
type ViewMode = 'board' | 'list';

const SORT_LABELS: Record<SortBy, string> = {
  recent: 'Sort: newest first',
  oldest: 'Sort: oldest first',
  name: 'Sort: name A–Z',
};

const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
};

// Fetched per stage, not overall - matches the API's @Max(100) on
// QueryLeadsDto.limit (src/leads/dto/query-leads.dto.ts). A single shared
// top-100-across-all-stages fetch would let a busy stage crowd others out
// of the board entirely; fetching each stage separately gives each column
// its own ceiling instead of one they all fight over.
const STAGE_FETCH_LIMIT = 100;
const LIST_PAGE_SIZE = 20;

type Columns = Record<LeadStage, Lead[]>;

@Component({
  selector: 'app-dashboard',
  imports: [DragDropModule, FormsModule, TimeAgoPipe, AppSelect],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly leadsApi = inject(Leads);
  private readonly toast = inject(ToastService);
  private readonly searchInput$ = new Subject<string>();

  protected readonly stages = STAGES;
  protected readonly sortSelectOptions: SelectOption<SortBy>[] = SORT_OPTIONS.map((value) => ({
    value,
    label: SORT_LABELS[value],
  }));
  protected readonly stageSelectOptions: SelectOption<LeadStage>[] = STAGES.map((value) => ({
    value,
    label: value,
  }));
  protected readonly exportCsvUrl = this.leadsApi.exportCsvUrl();

  protected readonly leads = signal<Lead[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly viewMode = signal<ViewMode>('board');
  protected readonly sortBy = signal<SortBy>('recent');
  protected readonly listPage = signal(1);

  private readonly query: Signal<string> = toSignal(
    this.searchInput$.pipe(takeUntilDestroyed(), debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );

  protected readonly totalLine = computed(() => {
    const count = this.leads().length;
    const suffix = this.query() ? ' · filtered' : '';
    return `${count} lead${count === 1 ? '' : 's'}${suffix}`;
  });

  protected readonly sortedLeads = computed(() => this.sortLeads(this.leads()));

  protected readonly columns = computed<Columns>(() => {
    const grouped: Columns = { new: [], contacted: [], closed: [] };
    for (const lead of this.sortedLeads()) {
      grouped[lead.stage].push(lead);
    }
    return grouped;
  });

  protected readonly listTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.leads().length / LIST_PAGE_SIZE)),
  );

  protected readonly listRows = computed(() => {
    const page = Math.min(this.listPage(), this.listTotalPages());
    const start = (page - 1) * LIST_PAGE_SIZE;
    return this.sortedLeads().slice(start, start + LIST_PAGE_SIZE);
  });

  constructor() {
    // Refetches whenever the debounced search query changes, including
    // the initial '' value on load - one effect covers both cases.
    effect(() => {
      const q = this.query();
      this.load(q);
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput$.next(value);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  setSortBy(sortBy: SortBy): void {
    this.sortBy.set(sortBy);
    this.listPage.set(1);
  }

  columnId(stage: LeadStage): string {
    return `column-${stage}`;
  }

  connectedColumns(stage: LeadStage): string[] {
    return this.stages.filter((s) => s !== stage).map((s) => this.columnId(s));
  }

  onDrop(event: CdkDragDrop<Lead[], Lead[], Lead>, targetStage: LeadStage): void {
    const lead = event.item.data;
    if (lead.stage === targetStage) {
      return; // Reordering within a column isn't persisted - there's no order field.
    }
    this.changeStage(lead, targetStage);
  }

  goToListPage(page: number): void {
    if (page < 1 || page > this.listTotalPages()) {
      return;
    }
    this.listPage.set(page);
  }

  protected changeStage(lead: Lead, stage: LeadStage, notify = true): void {
    // Looked up fresh rather than trusting `lead.stage`, since a queued
    // Undo action targets a lead that has since moved on again.
    const current = this.leads().find((l) => l.id === lead.id);
    const previousStage = current?.stage ?? lead.stage;
    if (previousStage === stage) {
      return;
    }

    this.leads.update((list) => list.map((l) => (l.id === lead.id ? { ...l, stage } : l)));

    this.leadsApi.updateStage(lead.id, stage).subscribe({
      next: () => {
        if (notify) {
          this.toast.show(`${lead.name} → ${STAGE_LABELS[stage]}`, {
            actionLabel: 'Undo',
            onAction: () => this.changeStage(lead, previousStage, false),
          });
        }
      },
      error: () => {
        this.error.set('Could not move that lead. Please try again.');
        this.leads.update((list) =>
          list.map((l) => (l.id === lead.id ? { ...l, stage: previousStage } : l)),
        );
      },
    });
  }

  private sortLeads(leads: Lead[]): Lead[] {
    const sorted = [...leads];
    switch (this.sortBy()) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'oldest':
        sorted.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      default:
        sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
    return sorted;
  }

  private load(q: string): void {
    this.loading.set(true);
    this.error.set('');
    this.listPage.set(1);

    forkJoin(
      this.stages.map((stage) =>
        this.leadsApi.list({ q: q || undefined, stage, limit: STAGE_FETCH_LIMIT }),
      ),
    ).subscribe({
      next: (results) => {
        this.leads.set(results.flatMap((result) => result.data));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load leads.');
      },
    });
  }
}
