import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import { Subscription } from 'rxjs';
import { Player } from '../../core/models/player.model';
import { MovementEvent } from '../../core/models/movement.model';
import { ChatMessage } from '../../core/models/chat-message.model';
import { GameService } from '../../core/services/game.service';

export interface PlayersState {
  players: Record<string, Player>;
  localPlayerId: string | null;
  isConnected: boolean;
  error: string | null;
  chatMessages: ChatMessage[];
}

const initialState: PlayersState = {
  players: {},
  localPlayerId: null,
  isConnected: false,
  error: null,
  chatMessages: []
};

export const PlayersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    playersList: computed(() => Object.values(store.players())),
    localPlayer: computed(() => {
      const playerId = store.localPlayerId();
      return playerId ? store.players()[playerId] ?? null : null;
    }),
    remotePlayers: computed(() => {
      const localId = store.localPlayerId();
      return Object.values(store.players()).filter(p => p.id !== localId);
    })
  })),
  withMethods((store, gameService = inject(GameService)) => {
    let movementSub: Subscription | null = null;
    let connectionSub: Subscription | null = null;
    let chatSub: Subscription | null = null;
    let playerJoinedSub: Subscription | null = null;
    let playerLeftSub: Subscription | null = null;
    let existingPlayersSub: Subscription | null = null;

    const addPlayer = (player: Player): void => {
      patchState(store, {
        players: { ...store.players(), [player.id]: player }
      });
    };

    const removePlayer = (playerId: string): void => {
      const { [playerId]: removed, ...remaining } = store.players();
      if (removed) {
        patchState(store, { players: remaining });
      }
    };

    const updatePlayerPosition = (
      playerId: string,
      position: { x: number; y: number },
      direction: Player['direction']
    ): void => {
      const player = store.players()[playerId];
      const isLocal = playerId === store.localPlayerId();

      if (!player) {
        addPlayer({
          id: playerId,
          name: isLocal ? playerName : 'Remote Player',
          position,
          direction,
          isLocal,
          lastUpdated: Date.now()
        });
        return;
      }

      patchState(store, {
        players: {
          ...store.players(),
          [playerId]: { ...player, position, direction, lastUpdated: Date.now() }
        }
      });
    };

    let playerName = 'Player';
    let currentRoomId: string | null = null;
    let localInitialPosition = { x: 250, y: 250 };

    const connect = (name?: string, roomId?: string): void => {
      if (store.isConnected()) return;
      playerName = name ?? localStorage.getItem('username') ?? 'Player';
      currentRoomId = roomId ?? null;

      connectionSub?.unsubscribe();
      connectionSub = gameService.connect().subscribe({
        next: (playerId) => {
          patchState(store, {
            isConnected: true,
            localPlayerId: playerId,
            error: null
          });

          addPlayer({
            id: playerId,
            name: playerName,
            position: { ...localInitialPosition },
            direction: 'up',
            isLocal: true,
            lastUpdated: Date.now()
          });

          gameService.joinGame(playerId, playerName, currentRoomId ?? '', localInitialPosition.x, localInitialPosition.y);
        },
        error: (error: Error) => {
          patchState(store, {
            isConnected: false,
            error: error?.message ?? 'Connection failed'
          });
        }
      });

      movementSub?.unsubscribe();
      movementSub = gameService.onPlayerMove().subscribe(({ playerId, movement }) => {
        updatePlayerPosition(playerId, movement.position, movement.direction);
      });

      chatSub?.unsubscribe();
      chatSub = gameService.onChatMessage().subscribe((message) => {
        patchState(store, {
          chatMessages: [...store.chatMessages(), message]
        });
      });

      playerJoinedSub?.unsubscribe();
      playerJoinedSub = gameService.onPlayerJoined().subscribe(({ playerId, playerName, x, y }) => {
        if (playerId !== store.localPlayerId()) {
          addPlayer({
            id: playerId,
            name: playerName,
            position: { x, y },
            direction: 'up',
            isLocal: false,
            lastUpdated: Date.now()
          });
        }
      });

      playerLeftSub?.unsubscribe();
      playerLeftSub = gameService.onPlayerLeft().subscribe((connectionId) => {
        removePlayer(connectionId);
      });

      existingPlayersSub?.unsubscribe();
      existingPlayersSub = gameService.onExistingPlayers().subscribe((players) => {
        for (const p of players) {
          if (p.playerId !== store.localPlayerId()) {
            addPlayer({
              id: p.playerId,
              name: p.playerName,
              position: { x: p.x, y: p.y },
              direction: 'up',
              isLocal: false,
              lastUpdated: Date.now()
            });
          }
        }
      });
    };

    const disconnect = (): void => {
      movementSub?.unsubscribe();
      connectionSub?.unsubscribe();
      chatSub?.unsubscribe();
      playerJoinedSub?.unsubscribe();
      playerLeftSub?.unsubscribe();
      existingPlayersSub?.unsubscribe();
      movementSub = null;
      connectionSub = null;
      chatSub = null;
      playerJoinedSub = null;
      playerLeftSub = null;
      existingPlayersSub = null;
      gameService.disconnect();
      currentRoomId = null;
      patchState(store, initialState);
    };

    const leaveRoom = (): void => {
      gameService.leaveRoom();
    };

    const sendPlayerMove = (movement: MovementEvent): void => {
      gameService.sendPlayerMove(movement);
    };

    const sendChatMessage = (sender: string, text: string): void => {
      gameService.sendChatMessage(sender, text);
    };

    const startGame = (mapName: string): void => {
      gameService.startGame(mapName);
    };

    const onGameStarted = () => gameService.onGameStarted();

    return {
      addPlayer,
      removePlayer,
      updatePlayerPosition,
      connect,
      disconnect,
      leaveRoom,
      sendPlayerMove,
      sendChatMessage,
      startGame,
      onGameStarted
    };
  })
);
