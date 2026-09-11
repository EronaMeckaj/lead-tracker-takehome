import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Auth } from '../auth/auth';
import { Lead, LeadStage, Leads } from '../leads/leads';

const STAGES: LeadStage[] = ['new', 'contacted', 'closed'];

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly leadsApi = inject(Leads);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly searchInput$ = new Subject<string>();

  protected readonly stages = STAGES;
  protected readonly currentUser = this.auth.currentUser;

  protected readonly leads = signal<Lead[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly stageFilter = signal<LeadStage | ''>('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  private q = '';

  ngOnInit(): void {
    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.q = value;
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  setStageFilter(stage: LeadStage | ''): void {
    this.stageFilter.set(stage);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page.set(page);
    this.load();
  }

  moveStage(lead: Lead, stage: LeadStage): void {
    if (stage === lead.stage) {
      return;
    }
    this.leadsApi.updateStage(lead.id, stage).subscribe({
      next: (updated) => {
        this.leads.update((current) => current.map((l) => (l.id === updated.id ? updated : l)));
      },
      error: () => this.error.set('Could not update that lead. Please try again.'),
    });
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.leadsApi
      .list({
        q: this.q || undefined,
        stage: this.stageFilter() || undefined,
        page: this.page(),
        limit: this.limit,
      })
      .subscribe({
        next: (result) => {
          this.leads.set(result.data);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Could not load leads.');
        },
      });
  }
}
