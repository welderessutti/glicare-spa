import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/config/api-url';
import { Observable } from 'rxjs';
import { Profile } from '../models/profile';
import { UpdateProfileRequest } from '../models/requests/update-profile-request';

@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly slug = 'profile';

  public get(): Observable<Profile> {
    return this.http.get<Profile>(`${this.apiUrl}/${this.slug}`);
  }

  public update(request: UpdateProfileRequest): Observable<Profile> {
    return this.http.put<Profile>(`${this.apiUrl}/${this.slug}`, request);
  }
}
