import { Component } from '../../core/Component.js';
import { bus } from '../../core/EventBus.js';

/**
 * Componente: Menú Principal
 * Controla la pantalla de bienvenida y los botones de acción (Jugar, Opciones, Ranking).
 */
export class SnakeMenu extends Component {
    async connectedCallback() {
        await this.loadResources(
            'src/components/menu/menu.html',
            'src/components/menu/menu.css'
        );
    }

    onMount() {
        this.menuScreen = this.$('#menu-screen');
        const btnPlay = this.$('#btn-play');
        const btnOptions = this.$('#btn-options');
        const btnRanking = this.$('#btn-ranking');

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                bus.emit('game:start');
            });
        }

        if (btnOptions) {
            btnOptions.addEventListener('click', () => {
                bus.emit('modal:open', 'options');
            });
        }

        if (btnRanking) {
            btnRanking.addEventListener('click', () => {
                bus.emit('modal:open', 'ranking');
            });
        }

        // Escuchar cambios de pantalla
        const offScreen = bus.on('screen:change', (activeScreen) => {
            if (this.menuScreen) {
                this.menuScreen.classList.toggle('active', activeScreen === 'menu');
            }
        });
        this.addCleanup(offScreen);
    }
}

customElements.define('snake-menu', SnakeMenu);
