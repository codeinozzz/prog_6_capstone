import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `<main style="max-width:800px;margin:3rem auto;padding:1rem">
    <a routerLink="/waiting-room">← Lobby</a>
    <h1>My profile</h1>
    @if (data$ | async; as data) {
      <dl>
        <dt>Player</dt>
        <dd>{{ data.username }}</dd>
        <dt>Email</dt>
        <dd>{{ data.email }}</dd>
        <dt>Games played</dt>
        <dd>{{ data.gamesPlayed }}</dd>
        <dt>Victories</dt>
        <dd>{{ data.victories }}</dd>
        <dt>Total score</dt>
        <dd>{{ data.totalScore }}</dd>
      </dl>
    }
  </main>`,
})
export class Profile {
  readonly data$ = inject(HttpClient).get<any>('http://localhost:5174/api/profile');
}
