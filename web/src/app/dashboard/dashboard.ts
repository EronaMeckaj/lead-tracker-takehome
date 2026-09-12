import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, Signal, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Lead, LeadStage, Leads } from '../leads/leads';
import { TimeAgoPipe } from './time-ago';

const STAGES: LeadStage[] = ['new', 'contacted', 'closed'];
const SORT_OPTIONS = ['recent', 'oldest', 'name'] as const;
type SortBy = (typeof SORT_OPTIONS)[number];
type ViewMode = 'board' | 'list';

// Matches the API's @Max(100) on QueryLeadsDto.limit (src/leads/dto/query-leads.dto.ts).
const BOARD_LIMIT = 100;
const LIST_PAGE_SIZE = 20;

type Columns = Record<LeadStage, Lead[]>;

@Component({
  selector: 'app-dashboard',
  imports: [DragDropModule, FormsModule, TimeAgoPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly leadsApi = inject(Leads);
  private readonly searchInput$ = new Subject<string>();

  protected readonly stages = STAGES;
  protected readonly sortOptions = SORT_OPTIONS;
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

  setSortBy(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortBy);
    this.listPage.set(1);
  }

  onListStageChange(lead: Lead, event: Event): void {
    const stage = (event.target as HTMLSelectElement).value as LeadStage;
    this.changeStage(lead, stage);
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

  private changeStage(lead: Lead, stage: LeadStage): void {
    const previousStage = lead.stage;
    this.leads.update((current) =>
      current.map((l) => (l.id === lead.id ? { ...l, stage } : l)),
    );

    this.leadsApi.updateStage(lead.id, stage).subscribe({
      error: () => {
        this.error.set('Could not move that lead. Please try again.');
        this.leads.update((current) =>
          current.map((l) => (l.id === lead.id ? { ...l, stage: previousStage } : l)),
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

    this.leadsApi.list({ q: q || undefined, limit: BOARD_LIMIT }).subscribe({
      next: (result) => {
        this.leads.set(result.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load leads.');
      },
    });
  }
}
