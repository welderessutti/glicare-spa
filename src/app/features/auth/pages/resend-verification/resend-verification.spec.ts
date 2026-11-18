import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResendVerification } from './resend-verification';

describe('ResendVerification', () => {
  let component: ResendVerification;
  let fixture: ComponentFixture<ResendVerification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResendVerification],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ResendVerification);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
