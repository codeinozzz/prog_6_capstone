import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerHub } from './player-hub';

describe('PlayerHub', () => {
  let component: PlayerHub;
  let fixture: ComponentFixture<PlayerHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
