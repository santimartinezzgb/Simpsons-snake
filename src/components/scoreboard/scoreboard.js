import { Component } from '../../core/Component.js';
import { bus } from '../../core/EventBus.js';

/**
 * Componente: Marcador / Scoreboard Simpsons (HUD)
 * Muestra personaje activo (sin foto), rosquillas comidas, tiempo y récord personal.
 */
export class SnakeScoreboard extends Component {
    constructor() {
        super();
        this.STORAGE_BEST = 'snake.best';
        this.best = Number(localStorage.getItem(this.STORAGE_BEST)) || 0;
    }

    async connectedCallback() {
        await this.loadResources(
            'src/components/scoreboard/scoreboard.html',
            'src/components/scoreboard/scoreboard.css'
        );
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    bump(element) {
        if (!element) return;
        element.classList.remove('bump');
        void element.offsetWidth;
        element.classList.add('bump');
    }

    updateCharacterBadge() {
        if (!window.SimpsonsService) return;
        const char = window.SimpsonsService.getSelectedCharacter();
        const nameEl = this.$('#hud-char-name');

        if (nameEl && char?.name) {
            nameEl.textContent = char.name.split(' ')[0];
        }
    }

    onMount() {
        this.hudScore = this.$('#hud-score');
        this.hudTime = this.$('#hud-time');
        this.hudBest = this.$('#hud-best');
        const btnPause = this.$('#btn-pause');

        this.updateCharacterBadge();

        if (this.hudBest) {
            this.hudBest.textContent = this.best;
        }

        if (btnPause) {
            btnPause.addEventListener('click', () => {
                bus.emit('game:pause-toggle');
            });
        }

        // Escuchar actualización de puntuación (Rosquillas)
        const offScore = bus.on('score:update', (score) => {
            if (this.hudScore) {
                this.hudScore.textContent = score;
                if (score > 0) this.bump(this.hudScore);
            }

            if (score > this.best) {
                this.best = score;
                if (this.hudBest) {
                    this.hudBest.textContent = this.best;
                    this.bump(this.hudBest);
                }
                localStorage.setItem(this.STORAGE_BEST, String(this.best));
            }
        });
        this.addCleanup(offScore);

        // Escuchar actualización de tiempo
        const offTime = bus.on('time:update', (seconds) => {
            if (this.hudTime) {
                this.hudTime.textContent = this.formatTime(seconds);
            }
        });
        this.addCleanup(offTime);

        // Escuchar reinicio de partida
        const offReset = bus.on('game:reset', () => {
            if (this.hudScore) this.hudScore.textContent = '0';
            if (this.hudTime) this.hudTime.textContent = '00:00';
            this.updateCharacterBadge();
        });
        this.addCleanup(offReset);

        // Escuchar cambio de personaje desde opciones
        const offCharChange = bus.on('simpsons:character-change', () => {
            this.updateCharacterBadge();
        });
        this.addCleanup(offCharChange);
    }
}

customElements.define('snake-scoreboard', SnakeScoreboard);
