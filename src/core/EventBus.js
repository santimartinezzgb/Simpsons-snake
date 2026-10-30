/**
 * Bus de eventos para la comunicación entre componentes.
 */
class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this.events = new Map();
    }

    /**
     * Suscribirse a un evento.
     * @param {string} event
     * @param {Function} callback
     * @returns {Function} Función para cancelar la suscripción.
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * Cancelar suscripción a un evento.
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.events.delete(event);
            }
        }
    }

    /**
     * Emitir un evento con datos asociados.
     * @param {string} event
     * @param {any} [data]
     */
    emit(event, data) {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.forEach((callback) => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`Error en listener de evento "${event}":`, err);
                }
            });
        }
    }
}

export const bus = new EventBus();
