import { Component } from '../../core/Component.js';
import { bus } from '../../core/EventBus.js';

/**
 * Componente: Modal Fin de Partida (Game Over — Los Simpson)
 * Solo muestra el formulario de registro y la clasificación si el jugador
 * ha superado al TOP 5 actual. En caso contrario, únicamente muestra sus marcas
 * (Rosquillas y Tiempo) y los botones para jugar de nuevo o volver al menú.
 */
export class SnakeGameOverModal extends Component {
    constructor() {
        super();
        this.STORAGE_NAME = 'snake.name';
        this.TOP_LIMIT = 5;
        this.lastResult = null;
        this.currentRanking = [];
    }

    async connectedCallback() {
        await this.loadResources(
            'src/components/gameover-modal/gameover-modal.html',
            'src/components/gameover-modal/gameover-modal.css'
        );
    }

    formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    setMsg(text, type = '') {
        const msgEl = this.$('#save-msg');
        if (msgEl) {
            msgEl.textContent = text;
            msgEl.className = text ? `form-msg ${type}`.trim() : 'form-msg';
            msgEl.hidden = !text;
        }
    }

    openModal() {
        const modal = this.$('#gameover-modal');
        if (modal) {
            modal.hidden = false;
            const focusable = modal.querySelector('input:not([disabled]):not([hidden]), button:not([disabled])');
            setTimeout(() => focusable?.focus(), 50);
        }
    }

    closeModal() {
        const modal = this.$('#gameover-modal');
        if (modal) {
            modal.hidden = true;
        }
    }

    /**
     * Renderiza el TOP 5 (posición, nombre, rosquillas y tiempo).
     * Sin fotos de personajes.
     */
    renderRanking(container, ranking, highlight = null) {
        container.replaceChildren();

        if (!ranking || !ranking.length) {
            const empty = document.createElement('div');
            empty.className = 'ranking-empty';
            empty.textContent = '¡Todavía no hay récords en Springfield! Sé el primero.';
            container.append(empty);
            return;
        }

        let highlighted = false;
        ranking.forEach((entry, i) => {
            const row = document.createElement('div');
            row.className = `rank-row pos-${i + 1}`;

            if (
                !highlighted &&
                highlight &&
                entry.name === highlight.name &&
                entry.score === highlight.score &&
                entry.time === highlight.time
            ) {
                row.classList.add('me');
                highlighted = true;
            }

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

    async loadRanking(container, gridSize = 12, highlight = null) {
        if (!container) return [];
        this.renderRankingState(container, 'loading', `Consultando ranking ${gridSize}x${gridSize}...`);
        try {
            const ranking = await window.Api.getRanking(gridSize);
            this.currentRanking = ranking || [];
            this.renderRanking(container, this.currentRanking, highlight);
            return this.currentRanking;
        } catch (err) {
            console.error(err);
            this.renderRankingState(container, 'error', 'No se pudo conectar con el ranking.');
            return null;
        }
    }

    /**
     * Comprueba si la partida SUPERA al TOP 5 actual:
     * - Debe tener más de 0 rosquillas.
     * - Si hay menos de 5 partidas registradas, entra directo.
     * - Si ya hay 5, debe superar al 5º clasificado (más rosquillas o igual rosquillas con menor tiempo).
     */
    qualifiesForTop(ranking, score, time) {
        if (score <= 0) return false;
        if (!ranking || ranking.length < this.TOP_LIMIT) return true;
        const last = ranking[this.TOP_LIMIT - 1];
        return score > last.score || (score === last.score && time < last.time);
    }

    onMount() {
        const title = this.$('#gameover-title');
        const finalScore = this.$('#final-score');
        const finalTime = this.$('#final-time');
        const saveForm = this.$('#save-form');
        const rankingCard = this.$('#gameover-ranking-card');
        const nameInput = this.$('#player-name');
        const btnSave = this.$('#btn-save');
        const btnSkip = this.$('#btn-skip');
        const gameoverRanking = this.$('#gameover-ranking');
        const btnRetry = this.$('#btn-retry');
        const btnMenu = this.$('#btn-menu');

        // Comprobación de duplicados en backend
        const checkDuplicateName = async (nameVal) => {
            const trimmed = nameVal.trim();
            if (!trimmed) return false;
            const currentGrid = this.lastResult?.gridSize || Number(localStorage.getItem('snake.gridSize')) || 12;
            try {
                return await window.Api.checkName(trimmed, currentGrid);
            } catch {
                const normalized = trimmed.toLowerCase();
                const taken = (this.currentRanking || []).map(e => e.name.trim().toLowerCase());
                return taken.includes(normalized);
            }
        };

        const validateNameInput = async () => {
            if (!nameInput) return true;
            const name = nameInput.value.trim().replace(/\s+/g, ' ');

            if (!name) {
                nameInput.classList.remove('invalid');
                this.setMsg('');
                if (btnSave) btnSave.disabled = false;
                return true;
            }

            const isDuplicate = await checkDuplicateName(name);
            if (isDuplicate) {
                nameInput.classList.add('invalid');
                this.setMsg('Este nombre ya está en uso en este tablero.', 'error');
                if (btnSave) btnSave.disabled = true;
                return false;
            } else {
                nameInput.classList.remove('invalid');
                this.setMsg('');
                if (btnSave) btnSave.disabled = false;
                return true;
            }
        };

        // Escuchar fin de partida
        const offGameOver = bus.on('game:over', async (result) => {
            const gridSize = result.gridSize || Number(localStorage.getItem('snake.gridSize')) || 12;
            this.lastResult = { ...result, gridSize };

            if (title) {
                title.textContent = result.won
                    ? '¡HAS SALVADO A SPRINGFIELD!'
                    : '¡FIN DE LA PARTIDA!';
            }

            const rankingHeaderTitle = this.$('#gameover-ranking-title');
            const rankingHeaderSub = this.$('#gameover-ranking-sub');
            if (rankingHeaderTitle) {
                rankingHeaderTitle.textContent = `Top 5 · Tablero ${gridSize}x${gridSize}`;
            }
            if (rankingHeaderSub) {
                rankingHeaderSub.textContent = `Los mejores en ${gridSize}x${gridSize} casillas`;
            }

            if (finalScore) finalScore.textContent = result.score;
            if (finalTime) finalTime.textContent = this.formatTime(result.time);

            // Por defecto, ocultar formulario de récord
            if (saveForm) {
                saveForm.hidden = true;
                saveForm.classList.remove('done');
            }

            if (nameInput) {
                nameInput.classList.remove('invalid');
                nameInput.disabled = false;
                nameInput.value = '';
            }
            if (btnSave) btnSave.disabled = false;
            if (btnSkip) btnSkip.disabled = false;
            this.setMsg('');

            this.openModal();

            // Consultar el TOP 5 del tablero jugado y mostrarlo al finalizar la partida
            try {
                const ranking = await window.Api.getRanking(gridSize);
                this.currentRanking = ranking || [];

                if (rankingCard) {
                    rankingCard.hidden = false;
                    if (gameoverRanking) {
                        this.renderRanking(gameoverRanking, this.currentRanking);
                    }
                }

                if (this.qualifiesForTop(this.currentRanking, result.score, result.time)) {
                    // Superó al TOP 5 de este tablero: mostrar formulario para registrar récord
                    if (saveForm) saveForm.hidden = false;
                    setTimeout(() => nameInput?.focus(), 50);
                } else {
                    // No superó al TOP 5: mantener el TOP 5 visible y enfocar botón reintentar
                    this.lastResult = null;
                    if (saveForm) saveForm.hidden = true;
                    setTimeout(() => btnRetry?.focus(), 50);
                }
            } catch (err) {
                console.error('Error al consultar TOP 5:', err);
                if (saveForm) saveForm.hidden = true;
                if (rankingCard && gameoverRanking) {
                    rankingCard.hidden = false;
                    this.renderRankingState(gameoverRanking, 'error', 'No se pudo cargar el ranking.');
                }
                setTimeout(() => btnRetry?.focus(), 50);
            }
        });
        this.addCleanup(offGameOver);

        // Envío de puntuación al backend PHP
        if (saveForm) {
            saveForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.lastResult) return;

                const name = nameInput.value.trim().replace(/\s+/g, ' ');
                if (!name || name.length > 20) {
                    nameInput.classList.add('invalid');
                    this.setMsg('Escribe un nombre de 1 a 20 caracteres.', 'error');
                    nameInput.focus();
                    return;
                }

                btnSave.disabled = true;

                const isRepeated = await checkDuplicateName(name);
                if (isRepeated) {
                    nameInput.classList.add('invalid');
                    this.setMsg('Este nombre ya está en uso en este tablero.', 'error');
                    btnSave.disabled = true;
                    nameInput.focus();
                    return;
                }

                nameInput.classList.remove('invalid');
                if (btnSkip) btnSkip.disabled = true;
                nameInput.disabled = true;

                try {
                    const ranking = await window.Api.saveScore(
                        name,
                        this.lastResult.score,
                        this.lastResult.time,
                        this.lastResult.gridSize || 12
                    );
                    this.currentRanking = ranking;
                    localStorage.setItem(this.STORAGE_NAME, name);

                    // Al guardar, el formulario desaparece directamente
                    if (saveForm) {
                        saveForm.hidden = true;
                        saveForm.classList.remove('done');
                    }
                    this.setMsg('');

                    const me = {
                        name,
                        score: this.lastResult.score,
                        time: this.lastResult.time,
                    };
                    if (gameoverRanking) {
                        this.renderRanking(gameoverRanking, ranking, me);
                    }
                    this.lastResult = null;
                    if (btnRetry) btnRetry.focus();
                } catch (err) {
                    console.error(err);
                    this.setMsg(`No se pudo guardar: ${err.message}`, 'error');
                    btnSave.disabled = false;
                    if (btnSkip) btnSkip.disabled = false;
                    nameInput.disabled = false;
                }
            });
        }

        if (btnSkip) {
            btnSkip.addEventListener('click', () => {
                this.lastResult = null;
                if (saveForm) {
                    saveForm.hidden = true;
                    saveForm.classList.remove('done');
                }
                this.setMsg('');
                if (btnRetry) btnRetry.focus();
            });
        }

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                validateNameInput();
            });
        }

        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                this.closeModal();
                bus.emit('game:start');
            });
        }

        if (btnMenu) {
            btnMenu.addEventListener('click', () => {
                this.closeModal();
                bus.emit('game:to-menu');
            });
        }

        const offCloseModal = bus.on('modal:close', (name) => {
            if (name === 'gameover' || name === 'all') {
                this.closeModal();
            }
        });
        this.addCleanup(offCloseModal);
    }
}

customElements.define('snake-gameover-modal', SnakeGameOverModal);
