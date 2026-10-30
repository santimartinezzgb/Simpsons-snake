/**
 * Clase base para componentes Web Component autónomos.
 * Cada componente vive en su propia carpeta y gestiona su plantilla HTML,
 * sus estilos CSS aislados y su ciclo de vida / lógica JS.
 */
export class Component extends HTMLElement {
    constructor() {
        super();
        this._ready = false;
        this._cleanups = [];
    }

    static _templateCache = new Map();

    /**
     * Carga el marcado HTML y la hoja de estilos CSS correspondiente al componente.
     * @param {string} htmlPath Ruta al archivo .html del componente
     * @param {string} cssPath Ruta al archivo .css del componente
     */
    async loadResources(htmlPath, cssPath) {
        try {
            // Inyectar CSS en el documento si no se ha inyectado aún
            if (cssPath && !document.querySelector(`link[data-component-css="${cssPath}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssPath;
                link.setAttribute('data-component-css', cssPath);
                document.head.appendChild(link);
            }

            // Descargar o recuperar de caché la plantilla HTML
            if (htmlPath) {
                let html = Component._templateCache.get(htmlPath);
                if (!html) {
                    const res = await fetch(htmlPath);
                    if (!res.ok) {
                        throw new Error(`No se pudo cargar la plantilla HTML de ${htmlPath}: ${res.statusText}`);
                    }
                    html = await res.text();
                    Component._templateCache.set(htmlPath, html);
                }
                this.innerHTML = html;
            }

            this._ready = true;
            this.onMount();
        } catch (error) {
            console.error(`Error al inicializar componente <${this.tagName.toLowerCase()}>:`, error);
        }
    }

    /**
     * Helper para seleccionar un elemento descendiente.
     * @param {string} selector
     * @returns {HTMLElement|null}
     */
    $(selector) {
        return this.querySelector(selector);
    }

    /**
     * Helper para seleccionar múltiples descendientes.
     * @param {string} selector
     * @returns {NodeListOf<HTMLElement>}
     */
    $$(selector) {
        return this.querySelectorAll(selector);
    }

    /**
     * Registra una función de limpieza a ejecutar cuando el elemento sea destruido.
     * @param {Function} cleanupFn
     */
    addCleanup(cleanupFn) {
        if (typeof cleanupFn === 'function') {
            this._cleanups.push(cleanupFn);
        }
    }

    /**
     * Ciclo de vida: llamado cuando el HTML y CSS se han inyectado.
     * Debe ser implementado por las subclases.
     */
    onMount() {}

    /**
     * Ciclo de vida nativo: cuando el elemento se desconecta del DOM.
     */
    disconnectedCallback() {
        while (this._cleanups.length > 0) {
            const cleanup = this._cleanups.pop();
            try {
                cleanup();
            } catch (err) {
                console.error('Error durante cleanup de componente:', err);
            }
        }
        this.onDestroy();
    }

    /**
     * Ciclo de vida para limpieza adicional opcional.
     */
    onDestroy() {}
}
