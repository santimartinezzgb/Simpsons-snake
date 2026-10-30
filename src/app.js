/**
 * Punto de Entrada Principal de la Aplicación.
 * Inicializa el servicio con la API de Los Simpson (API públicas + caché)
 */

import { bus } from './core/EventBus.js';
import { simpsonsService } from './core/SimpsonsService.js';

// Importar y registrar componentes de la arquitectura
import './components/menu/menu.js';
import './components/scoreboard/scoreboard.js';
import './components/board/board.js';
import './components/controls/controls.js';
import './components/gameover-modal/gameover-modal.js';
import './components/ranking-modal/ranking-modal.js';
import './components/options-modal/options-modal.js';

(() => {
    const KEY_DIRS = {
        ArrowUp: 'up',
        KeyW: 'up',
        ArrowDown: 'down',
        KeyS: 'down',
        ArrowLeft: 'left',
        KeyA: 'left',
        ArrowRight: 'right',
        KeyD: 'right',
    };

    const gameScreen = document.getElementById('game-screen');

    // Inicializar APIs de Los Simpson (personajes) en segundo plano
    simpsonsService.init().catch(err => {
        console.warn('Error inicializando SimpsonsService:', err);
    });

    // Gestión de navegación entre pantallas
    bus.on('game:start', () => {
        bus.emit('modal:close', 'all');
        bus.emit('screen:change', 'game');
        if (gameScreen) gameScreen.classList.add('active');
    });

    bus.on('game:to-menu', () => {
        bus.emit('modal:close', 'all');
        bus.emit('screen:change', 'menu');
        if (gameScreen) gameScreen.classList.remove('active');
    });

    // Control global de teclado
    document.addEventListener('keydown', (e) => {
        // No interceptar teclas mientras se escribe en un input (ej. guardar récord)
        if (e.target instanceof HTMLInputElement) return;

        // Escape para cerrar modales si alguno está abierto
        if (e.code === 'Escape') {
            bus.emit('modal:close', 'all');
            return;
        }

        // Si la pantalla de juego no está activa, no procesar movimientos
        if (!gameScreen || !gameScreen.classList.contains('active')) return;

        // Movimiento de la serpiente
        const dir = KEY_DIRS[e.code];
        if (dir) {
            e.preventDefault();
            bus.emit('game:direction', dir);
            return;
        }

        // Pausa mediante tecla P o Espacio
        if (e.code === 'KeyP' || e.code === 'Space') {
            e.preventDefault();
            bus.emit('game:pause-toggle');
        }
    });

    // Pausa automática al cambiar de pestaña
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameScreen && gameScreen.classList.contains('active')) {
            bus.emit('game:pause-toggle');
        }
    });
})();
