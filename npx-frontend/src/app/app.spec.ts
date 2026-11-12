import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('renders the real sign-in screen without seeded demo accounts', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Sign in to see your projects');
    expect(fixture.nativeElement.textContent).not.toContain('Olivia Rhye');
    expect(fixture.nativeElement.textContent).not.toContain('Preview as');
  });

  it('starts with no project tasks or calculated progress', () => {
    const app = TestBed.createComponent(App).componentInstance;

    expect(app.tasks).toEqual([]);
    expect(app.projects).toEqual([]);
    expect(app.progress).toBe(0);
  });
});
