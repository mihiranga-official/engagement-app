import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestWallComponent } from './guest-wall';

describe('GuestWallComponent', () => {
  let component: GuestWallComponent;
  let fixture: ComponentFixture<GuestWallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestWallComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GuestWallComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
