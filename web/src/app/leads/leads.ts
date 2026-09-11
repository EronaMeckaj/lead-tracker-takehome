import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export type LeadStage = 'new' | 'contacted' | 'closed';
export type LeadSource = 'form' | 'webhook';

export interface Lead {
  id: string;
  name: string;
  email: string;
  message: string;
  stage: LeadStage;
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLeads {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface ListLeadsParams {
  q?: string;
  stage?: LeadStage;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class Leads {
  private readonly http = inject(HttpClient);

  list(params: ListLeadsParams) {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));
    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params.stage) {
      httpParams = httpParams.set('stage', params.stage);
    }

    return this.http.get<PaginatedLeads>(`${environment.apiUrl}/leads`, { params: httpParams });
  }

  updateStage(id: string, stage: LeadStage) {
    return this.http.patch<Lead>(`${environment.apiUrl}/leads/${id}/stage`, { stage });
  }

  exportCsvUrl(): string {
    return `${environment.apiUrl}/leads/export.csv`;
  }
}
