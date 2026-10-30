/**
 * Comunicación con el backend PHP.
 */
const Api = (() => {
    const BASE = 'api';

    async function request(url, options = {}) {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            ...options,
        });

        let data;
        try {
            data = await res.json();
        } catch {
            throw new Error('Respuesta inválida del servidor');
        }

        if (!res.ok || !data.ok) {
            throw new Error(data.error || `Error ${res.status}`);
        }
        return data;
    }

    return {
        /** @returns {Promise<Array<{name:string, score:number, time:number, gridSize?:number}>>} */
        async getRanking(gridSize = null) {
            const url = gridSize ? `${BASE}/ranking.php?gridSize=${encodeURIComponent(gridSize)}` : `${BASE}/ranking.php`;
            const data = await request(url);
            return data.ranking;
        },

        /** @returns {Promise<{ '8': Array, '12': Array, '16': Array }>} */
        async getAllRankings() {
            const data = await request(`${BASE}/ranking.php`);
            return data.rankings || { '8': [], '12': data.ranking || [], '16': [] };
        },

        /** Guarda la puntuación para un tablero y devuelve el TOP 5 actualizado. */
        async saveScore(name, score, time, gridSize = 12) {
            const data = await request(`${BASE}/save_score.php`, {
                method: 'POST',
                body: JSON.stringify({ name, score, time, gridSize }),
            });
            return data.ranking;
        },

        /** Elimina (DELETE) las partidas sobrantes fuera del TOP 5 y devuelve el TOP resultante. */
        async pruneRanking(gridSize = null) {
            const url = gridSize ? `${BASE}/ranking.php?gridSize=${encodeURIComponent(gridSize)}` : `${BASE}/ranking.php`;
            const data = await request(url, { method: 'DELETE' });
            return data.ranking;
        },

        /** Comprueba si un nombre de usuario ya existe en la base de datos (o en un tablero). */
        async checkName(name, gridSize = null) {
            const url = `${BASE}/check_name.php?name=${encodeURIComponent(name)}${gridSize ? `&gridSize=${encodeURIComponent(gridSize)}` : ''}`;
            const data = await request(url);
            return data.exists;
        },
    };
})();

// Exponer en el objeto global para módulos ES y Web Components
window.Api = Api;

