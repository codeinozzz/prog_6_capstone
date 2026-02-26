import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import mqtt, { MqttClient } from 'mqtt';
import type {
  PowerUpEvent,
  CollisionEvent,
  GameEndEvent,
  ChatMqttEvent,
  PowerUpCollectedEvent,
  LatencySample,
} from '../models/mqtt-event.model';

@Injectable({ providedIn: 'root' })
export class MqttService implements OnDestroy {
  private client: MqttClient | null = null;
  private currentRoomId: string | null = null;

  // Subjects para cada tipo de evento
  readonly powerUpSpawned$ = new Subject<PowerUpEvent>();
  readonly powerUpCollected$ = new Subject<PowerUpCollectedEvent>();
  readonly collision$ = new Subject<CollisionEvent>();
  readonly gameEnd$ = new Subject<GameEndEvent>();
  readonly chatMessage$ = new Subject<ChatMqttEvent>();

  // Benchmarking: muestras de latencia MQTT
  readonly latencySamples: LatencySample[] = [];
  private readonly BROKER_WS = 'ws://localhost:8083/mqtt';
  private readonly TOPIC_PREFIX = 'battletanks';

  connect(roomId: string): void {
    if (this.client?.connected && this.currentRoomId === roomId) return;

    this.client?.end(true);
    this.currentRoomId = roomId;

    this.client = mqtt.connect(this.BROKER_WS, {
      clientId: `battletanks-angular-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 3000,
    });

    this.client.on('connect', () => {
      console.log('[MQTT] Connected to broker');
      this.subscribeToRoom(roomId);
    });

    this.client.on('error', (err) => {
      console.warn('[MQTT] Connection error:', err.message);
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });
  }

  disconnect(): void {
    if (this.client?.connected) {
      this.client.end(true);
    }
    this.client = null;
    this.currentRoomId = null;
  }

  // ---- Publicar eventos desde el frontend ----

  publishCollision(roomId: string, attackerId: string, victimId: string, damage: number): void {
    const payload: CollisionEvent = {
      attackerId,
      victimId,
      roomId,
      damage,
      timestamp: Date.now(),
    };
    this.publish(`${this.TOPIC_PREFIX}/room/${roomId}/collision`, payload, 0);
  }

  publishPowerUpCollected(roomId: string, powerUpId: string, collectorId: string): void {
    const payload = { powerUpId, collectorId, roomId, timestamp: Date.now() };
    this.publish(`${this.TOPIC_PREFIX}/room/${roomId}/powerup/collected`, payload, 1);
  }

  // ---- Benchmarking ----

  /** Mide la latencia publicando un mensaje con timestamp y esperando su recepción */
  sendBenchmarkPing(roomId: string): void {
    const topic = `${this.TOPIC_PREFIX}/room/${roomId}/benchmark`;
    const sentAt = Date.now();
    this.publish(topic, { sentAt, type: 'ping' }, 0);
  }

  getAverageLatency(): number {
    if (this.latencySamples.length === 0) return 0;
    const sum = this.latencySamples.reduce((acc, s) => acc + s.latencyMs, 0);
    return Math.round(sum / this.latencySamples.length);
  }

  getLatencyStats(): { avg: number; min: number; max: number; samples: number } {
    if (this.latencySamples.length === 0) return { avg: 0, min: 0, max: 0, samples: 0 };
    const latencies = this.latencySamples.map((s) => s.latencyMs);
    return {
      avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      samples: latencies.length,
    };
  }

  // ---- Internals ----

  private subscribeToRoom(roomId: string): void {
    if (!this.client) return;

    const topics = [
      `${this.TOPIC_PREFIX}/room/${roomId}/powerup/spawned`,
      `${this.TOPIC_PREFIX}/room/${roomId}/powerup/collected`,
      `${this.TOPIC_PREFIX}/room/${roomId}/collision`,
      `${this.TOPIC_PREFIX}/room/${roomId}/game/end`,
      `${this.TOPIC_PREFIX}/room/${roomId}/chat`,
      `${this.TOPIC_PREFIX}/room/${roomId}/benchmark`,
    ];

    topics.forEach((topic) => this.client!.subscribe(topic, { qos: 1 }));
    console.log('[MQTT] Subscribed to room topics:', roomId);
  }

  private publish(topic: string, payload: object, qos: 0 | 1 | 2 = 1): void {
    if (!this.client?.connected) {
      console.warn('[MQTT] Not connected, skipping publish to', topic);
      return;
    }
    this.client.publish(topic, JSON.stringify(payload), { qos });
  }

  private handleMessage(topic: string, raw: string): void {
    try {
      const payload = JSON.parse(raw);
      const receivedAt = Date.now();
      const sentAt: number = payload.timestamp ?? payload.sentAt ?? receivedAt;
      const latency = receivedAt - sentAt;
      console.log(`[MQTT] ${topic} | latency: ${latency}ms`);

      if (topic.endsWith('/powerup/spawned')) {
        this.powerUpSpawned$.next(payload as PowerUpEvent);
      } else if (topic.endsWith('/powerup/collected')) {
        this.powerUpCollected$.next(payload as PowerUpCollectedEvent);
      } else if (topic.endsWith('/collision')) {
        this.collision$.next(payload as CollisionEvent);
      } else if (topic.endsWith('/game/end')) {
        this.gameEnd$.next(payload as GameEndEvent);
      } else if (topic.endsWith('/chat')) {
        this.chatMessage$.next(payload as ChatMqttEvent);
      } else if (topic.endsWith('/benchmark')) {
        // Medir latencia round-trip
        const receivedAt = Date.now();
        const sentAt: number = payload.sentAt ?? receivedAt;
        const sample: LatencySample = {
          topic,
          sentAt,
          receivedAt,
          latencyMs: receivedAt - sentAt,
        };
        this.latencySamples.push(sample);
        // Mantener últimas 100 muestras
        if (this.latencySamples.length > 100) this.latencySamples.shift();
      }
    } catch (e) {
      console.warn('[MQTT] Failed to parse message:', raw);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
