import { Component } from '../../core/Component.js';
import { bus } from '../../core/EventBus.js';

/**
 * Componente: Tablero de Juego (Board - Televisión de Los Simpson)
 * Aloja el Canvas HTML5, los overlays de inicio y pausa, y la instancia del motor SnakeGame.
 */
export class SnakeBoard extends Component {
    constructor() {
        super();
        this.game = null;
        this.wallsMode = 'solid'; // Paredes sólidas que chocan
        this.themeMode = localStorage.getItem('snake.theme') || 'dark';
    }

    async connectedCallback() {
        await this.loadResources(
            'src/components/board/board.html',
            'src/components/board/board.css'
        );
    }

    onMount() {
        const boardWrap = this.$('.board-wrap');
        const canvas = this.$('#board');
        const overlayStart = this.$('#overlay-start');
        const overlayPause = this.$('#overlay-pause');
        const btnResume = this.$('#btn-resume');
        const btnQuit = this.$('#btn-quit');

        if (!canvas) return;

        const storedGrid = Number(localStorage.getItem('snake.gridSize'));
        const initialGrid = [8, 12, 16].includes(storedGrid) ? storedGrid : 12;

        // Inicializar motor SnakeGame temático
        this.game = new SnakeGame(
            canvas,
            {
                onStart: () => {
                    if (overlayStart) overlayStart.classList.add('hidden');
                },
                onScore: (score) => {
                    bus.emit('score:update', score);
                },
                onEat: (score) => {
                    bus.emit('game:eat', score);
                },
                onTime: (sec) => {
                    bus.emit('time:update', sec);
                },
                onGameOver: (result) => {
                    if (boardWrap) {
                        boardWrap.classList.add('danger', 'shake');
                    }
                    setTimeout(() => {
                        bus.emit('game:over', result);
                    }, 700);
                },
            },
            { walls: 'solid', theme: this.themeMode, gridSize: initialGrid }
        );

        // Acciones de overlay de pausa
        if (btnResume) {
            btnResume.addEventListener('click', () => {
                this.togglePause();
            });
        }

        if (btnQuit) {
            btnQuit.addEventListener('click', () => {
                bus.emit('game:to-menu');
            });
        }

        // Gestos táctiles de deslizamiento sobre el canvas
        let touchStart = null;
        canvas.addEventListener(
            'touchstart',
            (e) => {
                const t = e.changedTouches[0];
                touchStart = { x: t.clientX, y: t.clientY };
            },
            { passive: true }
        );

        canvas.addEventListener(
            'touchmove',
            (e) => {
                if (!touchStart) return;
                const t = e.changedTouches[0];
                const dx = t.clientX - touchStart.x;
                const dy = t.clientY - touchStart.y;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
                const dir = Math.abs(dx) > Math.abs(dy)
                    ? (dx > 0 ? 'right' : 'left')
                    : (dy > 0 ? 'down' : 'up');
                this.game.setDirection(dir);
                touchStart = { x: t.clientX, y: t.clientY };
            },
            { passive: true }
        );

        canvas.addEventListener('touchend', () => {
            touchStart = null;
        });

        // Eventos del Bus
        const offStart = bus.on('game:start', () => {
            if (boardWrap) {
                boardWrap.classList.remove('danger', 'shake');
            }
            if (overlayStart) overlayStart.classList.remove('hidden');
            if (overlayPause) overlayPause.classList.add('hidden');
            bus.emit('game:reset');
            this.game.setWallsMode('solid');
            const currentGrid = Number(localStorage.getItem('snake.gridSize'));
            if ([8, 12, 16].includes(currentGrid)) {
                this.game.setGridSize(currentGrid);
            }
            requestAnimationFrame(() => {
                this.game.resize();
                this.game.start();
            });
        });
        this.addCleanup(offStart);

        const offPauseToggle = bus.on('game:pause-toggle', () => {
            this.togglePause();
        });
        this.addCleanup(offPauseToggle);

        const offResume = bus.on('game:resume', () => {
            if (this.game && this.game.state === 'paused') {
                this.togglePause();
            }
        });
        this.addCleanup(offResume);

        const offToMenu = bus.on('game:to-menu', () => {
            if (this.game) this.game.stop();
            if (overlayPause) overlayPause.classList.add('hidden');
        });
        this.addCleanup(offToMenu);

        const offDir = bus.on('game:direction', (dir) => {
            if (this.game) this.game.setDirection(dir);
        });
        this.addCleanup(offDir);

        const offTheme = bus.on('options:theme-change', (theme) => {
            this.themeMode = theme;
            if (this.game) this.game.setTheme(theme);
        });
        this.addCleanup(offTheme);

        const offGrid = bus.on('options:grid-change', (size) => {
            if (this.game) this.game.setGridSize(size);
        });
        this.addCleanup(offGrid);

        const updateLocationBadge = (loc) => {
            const badge = this.$('#tv-location-badge');
            const location = loc || window.SimpsonsService?.getSelectedLocation();
            if (badge && location) {
                const badgeNames = {
                    1: '742 EVERGREEN',
                    2: 'SECTOR 7G',
                    5: "MOE'S TAVERN",
                    4: 'KWIK-E-MART',
                    3: 'ESCUELA',
                };
                badge.textContent = badgeNames[location.id] || location.name.slice(0, 14).toUpperCase();
            }
            if (this.game && location) {
                this.game.setLocation(location);
            }
        };

        updateLocationBadge();

        const offCharChange = bus.on('simpsons:character-change', () => {
            if (this.game && this.game.canvas) {
                this.game.render(1);
            }
        });
        this.addCleanup(offCharChange);

        const offLocChange = bus.on('simpsons:location-change', (loc) => {
            updateLocationBadge(loc);
        });
        this.addCleanup(offLocChange);
    }

    togglePause() {
        if (!this.game) return;
        const state = this.game.togglePause();
        const overlayPause = this.$('#overlay-pause');
        if (overlayPause) {
            overlayPause.classList.toggle('hidden', state !== 'paused');
            if (state === 'paused') {
                const btnResume = this.$('#btn-resume');
                setTimeout(() => btnResume?.focus(), 30);
            }
        }
    }
}

customElements.define('snake-board', SnakeBoard);
