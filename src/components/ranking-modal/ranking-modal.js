import { Component } from '../../core/Component.js';
import { bus } from '../../core/EventBus.js';

/**
 * Componente: Modal de Clasificación Global (Ranking de Springfield)
 * Muestra las 5 mejores puntuaciones históricas almacenadas en la base de datos.
 */
export class SnakeRankingModal extends Component {
    async connectedCallback() {
        await this.loadResources(
            'src/components/ranking-modal/ranking-modal.html',
            'src/components/ranking-modal/ranking-modal.css'
        );
    }

    formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    openModal() {
        const modal = this.$('#ranking-modal');
        if (modal) {
            modal.hidden = false;
            const focusable = modal.querySelector('button');
            setTimeout(() => focusable?.focus(), 50);
            this.loadAllRankings();
        }
    }

    closeModal() {
        const modal = this.$('#ranking-modal');
        if (modal) {
            modal.hidden = true;
        }
    }

    /**
     * Renderiza el top 5 (posición, nombre, rosquillas y tiempo).
     */
    renderRanking(container, ranking) {
        container.replaceChildren();

        if (!ranking || !ranking.length) {
            const empty = document.createElement('div');
            empty.className = 'ranking-empty';
            empty.textContent = '¡Sin récords en este tablero! Sé el primero.';
            container.append(empty);
            return;
        }

        ranking.forEach((entry, i) => {
            const row = document.createElement('div');
            row.className = `rank-row pos-${i + 1}`;

            const name = document.createElement('span');
            name.className = 'rank-name';
            name.textContent = entry.name;

            const score = document.createElement('span');
            score.className = 'rank-score';
            const scoreVal = document.createElement('span');
            scoreVal.textContent = entry.score;
            const scoreIcon = document.createElement('span');
            scoreIcon.className = 'rank-score-icon';
            scoreIcon.textContent = '🍩';
            score.append(scoreVal, scoreIcon);

            const time = document.createElement('span');
            time.className = 'rank-time';
            time.textContent = this.formatTime(entry.time);

            row.append(name, score, time);
            container.append(row);
        });
    }

    renderRankingState(container, type, text) {
        const div = document.createElement('div');
        div.className = `ranking-${type}`;
        div.textContent = text;
        container.replaceChildren(div);
    }

    async loadAllRankings() {
        const list8 = this.$('#ranking-list-8');
        const list12 = this.$('#ranking-list-12');
        const list16 = this.$('#ranking-list-16');

        if (list8) this.renderRankingState(list8, 'loading', 'Consultando 8x8...');
        if (list12) this.renderRankingState(list12, 'loading', 'Consultando 12x12...');
        if (list16) this.renderRankingState(list16, 'loading', 'Consultando 16x16...');

        try {
            const all = await window.Api.getAllRankings();
            if (list8) this.renderRanking(list8, all['8'] || []);
            if (list12) this.renderRanking(list12, all['12'] || []);
            if (list16) this.renderRanking(list16, all['16'] || []);
        } catch (err) {
            console.error(err);
            if (list8) this.renderRankingState(list8, 'error', 'Error al cargar 8x8.');
            if (list12) this.renderRankingState(list12, 'error', 'Error al cargar 12x12.');
            if (list16) this.renderRankingState(list16, 'error', 'Error al cargar 16x16.');
        }
    }

    onMount() {
        const modal = this.$('#ranking-modal');
        const btnClose = this.$('#btn-close-ranking');

        if (btnClose) {
            btnClose.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Escuchar apertura desde menú
        const offOpenModal = bus.on('modal:open', (modalName) => {
            if (modalName === 'ranking') {
                this.openModal();
            }
        });
        this.addCleanup(offOpenModal);

        // Escuchar cierre de modales
        const offCloseModal = bus.on('modal:close', (name) => {
            if (name === 'ranking' || name === 'all') {
                this.closeModal();
            }
        });
        this.addCleanup(offCloseModal);
    }
}

customElements.define('snake-ranking-modal', SnakeRankingModal);
