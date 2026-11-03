import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/config/api-url';
import { Observable } from 'rxjs';
import { Settings } from '../models/settings';
import { UpdateSettingsRequest } from '../models/requests/update-settings-request';

@Service()
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = `settings`;

  public get(): Observable<Settings> {
    return this.http.get<Settings>(`${this.apiUrl}/${this.slug}`);
  }

  public update(request: UpdateSettingsRequest): Observable<Settings> {
    return this.http.put<Settings>(`${this.apiUrl}/${this.slug}`, request);
  }
}
