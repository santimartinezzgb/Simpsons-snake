import { Component } from '../../core/Component.js';
import { bus } from '../../core/EventBus.js';

/**
 * Componente: Controles Táctiles (D-Pad)
 * Proporciona cruceta en pantalla para dispositivos táctiles.
 */
export class SnakeControls extends Component {
    async connectedCallback() {
        await this.loadResources(
            'src/components/controls/controls.html',
            'src/components/controls/controls.css'
        );
    }

    onMount() {
        const buttons = this.$$('.dpad-btn');
        buttons.forEach((btn) => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const dir = btn.dataset.dir;
                if (dir) {
                    bus.emit('game:direction', dir);
                }
            });
        });
    }
}

customElements.define('snake-controls', SnakeControls);
