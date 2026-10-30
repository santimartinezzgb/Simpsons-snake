import { Component } from '../../core/Component.js';
import { bus } from '../../core/EventBus.js';

/**
 * Componente: Modal de Opciones y Configuración de Springfield
 * Permite seleccionar el tamaño del tablero (8x8, 12x12, 16x16) y activar/desactivar sonido.
 */
export class SnakeOptionsModal extends Component {
    constructor() {
        super();
        this.STORAGE_SOUND = 'snake.sound';
        this.STORAGE_GRID = 'snake.gridSize';
        this.soundEnabled = localStorage.getItem(this.STORAGE_SOUND) !== 'false';
        const savedGrid = Number(localStorage.getItem(this.STORAGE_GRID));
        this.gridSize = [8, 12, 16].includes(savedGrid) ? savedGrid : 12;
    }

    async connectedCallback() {
        await this.loadResources(
            'src/components/options-modal/options-modal.html',
            'src/components/options-modal/options-modal.css'
        );
    }

    openModal() {
        const modal = this.$('#options-modal');
        if (modal) {
            this.updateGridUI();
            this.updateSoundUI();
            modal.hidden = false;
            const focusable = modal.querySelector('button');
            setTimeout(() => focusable?.focus(), 50);
        }
    }

    closeModal() {
        const modal = this.$('#options-modal');
        if (modal) {
            modal.hidden = true;
        }
    }

    updateSoundUI() {
        const switchSound = this.$('#switch-sound');
        const optionSound = this.$('#option-sound');
        if (switchSound) switchSound.checked = this.soundEnabled;
        if (optionSound) {
            optionSound.classList.toggle('selected', this.soundEnabled);
            optionSound.setAttribute('aria-pressed', this.soundEnabled ? 'true' : 'false');
        }
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = Boolean(enabled);
        localStorage.setItem(this.STORAGE_SOUND, this.soundEnabled ? 'true' : 'false');
        window.soundEngine?.setEnabled(this.soundEnabled);
        this.updateSoundUI();
    }

    updateGridUI() {
        const buttons = this.$$('.grid-size-btn');
        buttons.forEach(btn => {
            const size = Number(btn.dataset.size);
            const isSelected = size === this.gridSize;
            btn.classList.toggle('selected', isSelected);
            btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
        const desc = this.$('#grid-desc');
        if (desc) {
            desc.textContent = `Cuadrícula: ${this.gridSize}x${this.gridSize} casillas`;
        }
    }

    setGridSize(size) {
        const val = Number(size);
        if ([8, 12, 16].includes(val)) {
            this.gridSize = val;
            localStorage.setItem(this.STORAGE_GRID, String(val));
            this.updateGridUI();
            bus.emit('options:grid-change', val);
        }
    }

    onMount() {
        const modal = this.$('#options-modal');
        const btnClose = this.$('#btn-close-options');
        const btnSave = this.$('#btn-save-options');
        const optionSound = this.$('#option-sound');
        const switchSound = this.$('#switch-sound');
        const gridBtns = this.$$('.grid-size-btn');

        this.updateGridUI();
        this.updateSoundUI();

        gridBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const size = Number(btn.dataset.size);
                this.setGridSize(size);
            });
        });

        if (btnClose) btnClose.addEventListener('click', () => this.closeModal());
        if (btnSave) btnSave.addEventListener('click', () => this.closeModal());

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }

        // Toggle Sonido
        if (optionSound) {
            optionSound.addEventListener('click', (e) => {
                if (e.target.closest('.apple-switch')) return;
                this.setSoundEnabled(!this.soundEnabled);
            });
            optionSound.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.setSoundEnabled(!this.soundEnabled);
                }
            });
        }

        if (switchSound) {
            switchSound.addEventListener('change', () => {
                this.setSoundEnabled(switchSound.checked);
            });
        }

        // Eventos del bus
        const offOpenModal = bus.on('modal:open', (modalName) => {
            if (modalName === 'options') {
                this.openModal();
            }
        });
        this.addCleanup(offOpenModal);

        const offCloseModal = bus.on('modal:close', (name) => {
            if (name === 'options' || name === 'all') {
                this.closeModal();
            }
        });
        this.addCleanup(offCloseModal);
    }
}

customElements.define('snake-options-modal', SnakeOptionsModal);
