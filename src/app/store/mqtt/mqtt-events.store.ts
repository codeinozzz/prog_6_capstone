import { inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';
import { MqttService } from '../../core/services/mqtt.service';
import type { PowerUpEvent, LatencySample } from '../../core/models/mqtt-event.model';

interface ActivePowerUp extends PowerUpEvent {
  active: boolean;
}

interface MqttEventsState {
  activePowerUps: ActivePowerUp[];
  latencySamples: LatencySample[];
  isConnected: boolean;
  lastEvent: string | null;
}

const initialState: MqttEventsState = {
  activePowerUps: [],
  latencySamples: [],
  isConnected: false,
  lastEvent: null,
};

export const MqttEventsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((state) => ({
    powerUpCount: computed(() => state.activePowerUps().filter((p) => p.active).length),
    avgLatencyMs: computed(() => {
      const samples = state.latencySamples();
      if (samples.length === 0) return 0;
      return Math.round(samples.reduce((a, s) => a + s.latencyMs, 0) / samples.length);
    }),
  })),

  withMethods((store, mqttService = inject(MqttService)) => ({
    connectToRoom(roomId: string): void {
      mqttService.connect(roomId);
      patchState(store, { isConnected: true, activePowerUps: [] });

      mqttService.powerUpSpawned$.subscribe((pu) => {
        patchState(store, (s) => ({
          activePowerUps: [...s.activePowerUps, { ...pu, active: true }],
          lastEvent: `powerup_spawned:${pu.type}`,
        }));
      });

      mqttService.powerUpCollected$.subscribe((ev) => {
        patchState(store, (s) => ({
          activePowerUps: s.activePowerUps.map((p) =>
            p.id === ev.powerUpId ? { ...p, active: false } : p
          ),
          lastEvent: `powerup_collected:${ev.powerUpId}`,
        }));
      });
    },

    initializePowerUps(powerUps: PowerUpEvent[]): void {
      const active = powerUps.map(pu => ({ ...pu, active: true }));
      patchState(store, { activePowerUps: active });
    },

    disconnect(): void {
      mqttService.disconnect();
      patchState(store, { isConnected: false, activePowerUps: [] });
    },

    removePowerUp(id: string): void {
      patchState(store, (s) => ({
        activePowerUps: s.activePowerUps.map((p) =>
          p.id === id ? { ...p, active: false } : p
        ),
      }));
    },

    refreshLatencySamples(): void {
      const samples = [...mqttService.latencySamples];
      patchState(store, { latencySamples: samples });
    },

    runBenchmark(roomId: string, iterations = 10): void {
      let count = 0;
      const interval = setInterval(() => {
        mqttService.sendBenchmarkPing(roomId);
        count++;
        if (count >= iterations) {
          clearInterval(interval);
            setTimeout(() => {
            const samples = [...mqttService.latencySamples];
            patchState(store, { latencySamples: samples });
          }, 200);
        }
      }, 50);
    },
  }))
);
