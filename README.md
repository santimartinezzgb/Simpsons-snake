# Snake

Videojuego Snake en HTML, CSS, JavaScript y PHP con ranking en **MongoDB Atlas**.


## Puesta en marcha

1. Necesitas PHP 8.1+ con la extensión `mongodb` (`php -m | grep mongodb`).
2. Copia `.env.example` a `.env` y pon tu cadena de conexión de Atlas:
   ```
   MONGODB_URI=mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/
   MONGODB_DB=snake
   MONGODB_COLLECTION=scores
   ```
   En Atlas → *Network Access*, permite tu IP.
3. Arranca el servidor:
   ```bash
   php -S localhost:8080 router.php
   ```
4. Abre <http://localhost:8080>.

## Controles

- **Flechas** o **WASD**: mover
- **P / Esc / Espacio**: pausa


## Documento guardado en MongoDB

```json
{
  "name": "Santi",
  "score": 12,
  "time": 47,
  "gridSize": 12,
  "createdAt": ISODate("...")
}
```

- `name`: Nombre del jugador (1 a 20 caracteres).
- `score`: Rosquillas comidas / puntos acumulados.
- `time`: Duración de la partida en segundos.
- `gridSize`: Tamaño del tablero (8, 12 o 16 casillas).
- `createdAt`: Fecha y hora UTC del registro.
