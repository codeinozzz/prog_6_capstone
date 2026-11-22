# Battle Tanks — Angular Frontend

Multiplayer canvas game using Angular, SignalStore, SignalR and MQTT. Its backend is maintained separately in [prog_6_back](https://github.com/codeinozzz/prog_6_back).

## Requirements

- Node.js 24 and npm.
- Backend API running at http://localhost:5174.
- The backend's Docker services running, including EMQX at ws://localhost:8083/mqtt.

## Install and run

From this repository's root directory:

```text
npm ci
npm start -- --port 4206
```

Open http://localhost:4206. Keep the frontend and backend terminals open. Stop the frontend with Ctrl+C.

Register an account. To test multiplayer, open an incognito window and register a second account. Create a room with the first account, join it with the second and start the game as the room creator.

## Verification

```text
npm run build
npm test -- --watch=false
npm run format:check
```

Run `npm run format` to apply the project's formatting configuration.

## Features

Desert, Forest and Night City maps; movement, shooting, chat, power-ups, profile and ranking. SignalR applies hit damage once; MQTT carries notifications without applying the same damage again. The canvas keeps a logical 400×400 coordinate system.
