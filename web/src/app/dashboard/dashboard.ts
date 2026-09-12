import { DatePipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Lead, LeadStage, Leads } from '../leads/leads';

const STAGES: LeadStage[] = ['new', 'contacted', 'closed'];
const BOARD_LIMIT = 200;

type Columns = Record<LeadStage, Lead[]>;

@Component({
  selector: 'app-dashboard',
  imports: [DragDropModule, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly leadsApi = inject(Leads);
  private readonly searchInput$ = new Subject<string>();

  protected readonly stages = STAGES;
  protected readonly exportCsvUrl = this.leadsApi.exportCsvUrl();

  protected readonly columns = signal<Columns>({ new: [], contacted: [], closed: [] });
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  private q = '';

  ngOnInit(): void {
    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.q = value;
      this.load();
    });
    this.load();
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  columnId(stage: LeadStage): string {
    return `column-${stage}`;
  }

  connectedColumns(stage: LeadStage): string[] {
    return this.stages.filter((s) => s !== stage).map((s) => this.columnId(s));
  }

  onDrop(event: CdkDragDrop<Lead[]>, targetStage: LeadStage): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const lead = event.previousContainer.data[event.previousIndex];
    const previousStage = this.stageForContainerId(event.previousContainer.id);

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
    this.columns.update((current) => ({ ...current }));

    this.leadsApi.updateStage(lead.id, targetStage).subscribe({
      error: () => {
        this.error.set('Could not move that lead. Please try again.');
        // Roll back to where it came from.
        const rolledBack = { ...this.columns() };
        rolledBack[targetStage] = rolledBack[targetStage].filter((l) => l.id !== lead.id);
        rolledBack[previousStage] = [...rolledBack[previousStage], lead];
        this.columns.set(rolledBack);
      },
    });
  }

  private stageForContainerId(id: string): LeadStage {
    const stage = this.stages.find((s) => this.columnId(s) === id);
    if (!stage) {
      throw new Error(`Unknown column id: ${id}`);
    }
    return stage;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.leadsApi.list({ q: this.q || undefined, limit: BOARD_LIMIT }).subscribe({
      next: (result) => {
        const grouped: Columns = { new: [], contacted: [], closed: [] };
        for (const lead of result.data) {
          grouped[lead.stage].push(lead);
        }
        this.columns.set(grouped);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load leads.');
      },
    });
  }
}
