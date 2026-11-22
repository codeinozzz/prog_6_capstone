import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [AsyncPipe, RouterLink],
  template: `<main style="max-width:800px;margin:3rem auto;padding:1rem">
    <a routerLink="/waiting-room">← Lobby</a>
    <h1>Global ranking</h1>
    @if (data$ | async; as data) {
      <table style="width:100%;text-align:left">
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
            <th>Victories</th>
            <th>Games</th>
          </tr>
        </thead>
        <tbody>
          @for (player of data.data; track player.id) {
            <tr>
              <td>{{ player.username }}</td>
              <td>{{ player.totalScore }}</td>
              <td>{{ player.victories }}</td>
              <td>{{ player.gamesPlayed }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  </main>`,
})
export class Ranking {
  readonly data$ = inject(HttpClient).get<any>('http://localhost:5174/api/ranking');
}
