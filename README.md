# Battle Tanks — Angular

Juego multijugador con canvas, SignalStore, SignalR y MQTT. Backend en el repositorio prog_6_back.

## Ejecutar

Requiere Node 24 y npm. Inicia primero el backend y sus servicios Docker.

```sh
npm ci
npm start -- --port 4206
```

Abre http://localhost:4206. La API debe responder en http://localhost:5174 y EMQX por WebSocket en ws://localhost:8083/mqtt. Registra una cuenta; usa una ventana de incógnito para el segundo jugador. Crea una sala, únete desde la segunda cuenta e inicia con la cuenta creadora.

Se conservan los mapas Desert, Forest y Night City y el estilo retro del clon. Incluye chat, power-ups, perfil y ranking. SignalR aplica los impactos; MQTT transporta la notificación sin duplicar el daño. El canvas mantiene coordenadas lógicas 400×400.

## Verificar

```sh
npm run build
npm test -- --watch=false
npm run format:check
```

npm run format aplica la indentación del código.
