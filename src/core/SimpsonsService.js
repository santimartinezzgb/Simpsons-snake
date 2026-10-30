/**
 * SimpsonsService — Servicio centralizado para la integración de APIs de Los Simpson.
 *
 * Consume:
 * - thesimpsonsapi.com (Personajes, Frases y Ubicaciones de Springfield)
 * - thesimpsonsquoteapi.glitch.me (Citas y Sprites)
 *
 * Incluye almacenamiento en caché (memoria + sessionStorage) y fallbacks completos
 * para garantizar funcionamiento fluido a 60 FPS sin peticiones bloqueantes.
 */

const CDN_BASE = 'https://cdn.thesimpsonsapi.com';
const API_CHARACTERS = 'https://thesimpsonsapi.com/api/characters';
const API_LOCATIONS = 'https://thesimpsonsapi.com/api/locations';
const API_QUOTES = 'https://thesimpsonsquoteapi.glitch.me/quotes?count=15';

// Fallback robusto de personajes icónicos
const FALLBACK_CHARACTERS = [
    {
        id: 1,
        name: 'Homer Simpson',
        portrait_path: '/character/1.webp',
        image: `${CDN_BASE}/500/character/1.webp`
    },
    {
        id: 3,
        name: 'Bart Simpson',
        portrait_path: '/character/3.webp',
        image: `${CDN_BASE}/500/character/3.webp`
    },
    {
        id: 4,
        name: 'Lisa Simpson',
        portrait_path: '/character/4.webp',
        image: `${CDN_BASE}/500/character/4.webp`,
    },
    {
        id: 2,
        name: 'Marge Simpson',
        portrait_path: '/character/2.webp',
        image: `${CDN_BASE}/500/character/2.webp`
    },
    {
        id: 9,
        name: 'Ned Flanders',
        portrait_path: '/character/9.webp',
        image: `${CDN_BASE}/500/character/9.webp`,
    },
    {
        id: 13,
        name: 'Sr. Burns',
        portrait_path: '/character/13.webp',
        image: `${CDN_BASE}/500/character/13.webp`,
    },
    {
        id: 15,
        name: 'Krusty el Payaso',
        portrait_path: '/character/15.webp',
        image: `${CDN_BASE}/500/character/15.webp`,
    },
    {
        id: 16,
        name: 'Moe Szyslak',
        portrait_path: '/character/16.webp',
        image: `${CDN_BASE}/500/character/16.webp`,
    }
];

// Fallback robusto de ubicaciones míticas de Springfield
const FALLBACK_LOCATIONS = [
    {
        id: 2,
        name: 'Central Nuclear de Springfield',
        image_path: '/location/2.webp',
        image: `${CDN_BASE}/1280/location/2.webp`,
        town: 'Springfield',
        color: '#7ED957'
    },
    {
        id: 1,
        name: 'Casa de los Simpson (742 Evergreen Terrace)',
        image_path: '/location/1.webp',
        image: `${CDN_BASE}/1280/location/1.webp`,
        town: 'Springfield',
        color: '#FF69B4'
    },
    {
        id: 5,
        name: "Taberna de Moe",
        image_path: '/location/5.webp',
        image: `${CDN_BASE}/1280/location/5.webp`,
        town: 'Springfield',
        color: '#E67E22'
    },
    {
        id: 4,
        name: 'Kwik-E-Mart (El Badulaque)',
        image_path: '/location/4.webp',
        image: `${CDN_BASE}/1280/location/4.webp`,
        town: 'Springfield',
        color: '#3498DB'
    },
    {
        id: 3,
        name: 'Escuela Primaria de Springfield',
        image_path: '/location/3.webp',
        image: `${CDN_BASE}/1280/location/3.webp`,
        town: 'Springfield',
        color: '#F1C40F'
    }
];

// Fallback de citas célebres
const FALLBACK_QUOTES = [
    {
        quote: "Tendrá todo el dinero del mundo, pero hay algo que nunca podrá comprar... un dinosaurio.",
        character: "Homer Simpson",
        image: `${CDN_BASE}/500/character/1.webp`
    },
    {
        quote: "Mmm... rosquillas prohibidas...",
        character: "Homer Simpson",
        image: `${CDN_BASE}/500/character/1.webp`
    },
    {
        quote: "¡Ay, caramba!",
        character: "Bart Simpson",
        image: `${CDN_BASE}/500/character/3.webp`
    },
    {
        quote: "Si alguien me necesita, estaré en mi habitación.",
        character: "Lisa Simpson",
        image: `${CDN_BASE}/500/character/4.webp`
    },
    {
        quote: "¡Hola, holita, vecinito!",
        character: "Ned Flanders",
        image: `${CDN_BASE}/500/character/9.webp`
    },
    {
        quote: "¡Excelente!",
        character: "Sr. Burns",
        image: `${CDN_BASE}/500/character/13.webp`
    },
    {
        quote: "No puedes triunfar en la vida sin comerte unas cuantas rosquillas.",
        character: "Homer Simpson",
        image: `${CDN_BASE}/500/character/1.webp`
    }
];

class SimpsonsService {
    constructor() {
        this.characters = [...FALLBACK_CHARACTERS];
        this.locations = [...FALLBACK_LOCATIONS];
        this.quotes = [...FALLBACK_QUOTES];
        this.imagesCache = new Map(); // url -> HTMLImageElement
        this.initialized = false;

        // Claves de persistencia
        this.STORAGE_CHAR = 'simpsons.characterId';
        this.STORAGE_LOC = 'simpsons.locationId';

        this.selectedCharacterId = Number(localStorage.getItem(this.STORAGE_CHAR)) || 1;
        this.selectedLocationId = Number(localStorage.getItem(this.STORAGE_LOC)) || 2;
    }

    /**
     * Inicializa el servicio, carga datos de APIs públicas con caché y precarga imágenes.
     */
    async init() {
        if (this.initialized) return;

        // 1. Intentar cargar desde sessionStorage para máxima velocidad
        this.loadFromSessionStorage();

        // 2. Ejecutar peticiones en paralelo sin bloquear
        try {
            await Promise.allSettled([
                this.fetchCharacters(),
                this.fetchLocations(),
                this.fetchQuotes()
            ]);
        } catch (e) {
            console.warn('[SimpsonsService] Error parcial en carga de APIs, usando datos locales:', e);
        }

        // 3. Precargar las imágenes de los personajes y ubicaciones activas en memoria
        this.preloadEssentialImages();

        this.initialized = true;
    }

    loadFromSessionStorage() {
        try {
            const cachedChars = sessionStorage.getItem('simpsons_chars_cache');
            if (cachedChars) {
                const parsed = JSON.parse(cachedChars);
                if (Array.isArray(parsed) && parsed.length > 0) this.characters = parsed;
            }

            const cachedLocs = sessionStorage.getItem('simpsons_locs_cache');
            if (cachedLocs) {
                const parsed = JSON.parse(cachedLocs);
                if (Array.isArray(parsed) && parsed.length > 0) this.locations = parsed;
            }

            const cachedQuotes = sessionStorage.getItem('simpsons_quotes_cache');
            if (cachedQuotes) {
                const parsed = JSON.parse(cachedQuotes);
                if (Array.isArray(parsed) && parsed.length > 0) this.quotes = parsed;
            }
        } catch (e) {
            console.warn('[SimpsonsService] Error leyendo de sessionStorage:', e);
        }
    }

    async fetchCharacters() {
        try {
            const res = await fetch(API_CHARACTERS, { cache: 'force-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data && Array.isArray(data.results) && data.results.length > 0) {
                // Formatear personajes con su URL completa en CDN
                const formatted = data.results.slice(0, 30).map(c => ({
                    id: c.id,
                    name: c.name,
                    portrait_path: c.portrait_path,
                    image: c.portrait_path ? `${CDN_BASE}/500${c.portrait_path}` : `${CDN_BASE}/500/character/1.webp`,
                    phrases: Array.isArray(c.phrases) && c.phrases.length > 0
                        ? c.phrases
                        : (FALLBACK_CHARACTERS.find(f => f.name === c.name)?.phrases || ["¡Woo-hoo!", "¡D'oh!"])
                }));

                // Combinar asegurando que Homer, Bart, Lisa, Marge y Flanders siempre estén con buenas frases
                const mergedMap = new Map();
                FALLBACK_CHARACTERS.forEach(f => mergedMap.set(f.id, f));
                formatted.forEach(c => {
                    const existing = mergedMap.get(c.id);
                    if (existing && existing.phrases && existing.phrases.length > c.phrases.length) {
                        mergedMap.set(c.id, { ...c, phrases: existing.phrases });
                    } else {
                        mergedMap.set(c.id, c);
                    }
                });

                this.characters = Array.from(mergedMap.values());
                sessionStorage.setItem('simpsons_chars_cache', JSON.stringify(this.characters));
            }
        } catch (err) {
            console.warn('[SimpsonsService] Fallo al consultar thesimpsonsapi.com/api/characters:', err);
        }
    }

    async fetchLocations() {
        try {
            const res = await fetch(API_LOCATIONS, { cache: 'force-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data && Array.isArray(data.results) && data.results.length > 0) {
                const formatted = data.results.slice(0, 15).map(l => ({
                    id: l.id,
                    name: l.name,
                    image_path: l.image_path,
                    image: l.image_path ? `${CDN_BASE}/1280${l.image_path}` : `${CDN_BASE}/1280/location/2.webp`,
                    town: l.town || 'Springfield'
                }));

                // Mergear con fallbacks para garantizar nombres en español / descripciones
                const mergedMap = new Map();
                FALLBACK_LOCATIONS.forEach(f => mergedMap.set(f.id, f));
                formatted.forEach(l => {
                    const existing = mergedMap.get(l.id);
                    mergedMap.set(l.id, existing ? { ...l, name: existing.name } : l);
                });

                this.locations = Array.from(mergedMap.values());
                sessionStorage.setItem('simpsons_locs_cache', JSON.stringify(this.locations));
            }
        } catch (err) {
            console.warn('[SimpsonsService] Fallo al consultar thesimpsonsapi.com/api/locations:', err);
        }
    }

    async fetchQuotes() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(API_QUOTES, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Respuesta no JSON');
            }

            if (Array.isArray(data) && data.length > 0) {
                this.quotes = data.map(q => ({
                    quote: q.quote,
                    character: q.character,
                    image: q.image || `${CDN_BASE}/500/character/1.webp`
                }));
                sessionStorage.setItem('simpsons_quotes_cache', JSON.stringify(this.quotes));
            }
        } catch (err) {
            // Glitch a menudo está dormido o caído; sintetizamos citas desde los personajes cargados
            console.info('[SimpsonsService] API de Glitch no disponible; usando citas de personajes y fallbacks locales.');
            const synthesized = [];
            this.characters.forEach(c => {
                if (c.phrases) {
                    c.phrases.forEach(phrase => {
                        synthesized.push({
                            quote: phrase,
                            character: c.name,
                            image: c.image
                        });
                    });
                }
            });
            if (synthesized.length > 0) {
                this.quotes = [...FALLBACK_QUOTES, ...synthesized];
            }
        }
    }

    /**
     * Precarga imágenes en objetos Image() para renderizado instantáneo en Canvas y DOM.
     */
    preloadEssentialImages() {
        const urls = [
            ...this.characters.map(c => c.image),
            ...this.locations.map(l => l.image),
            ...this.quotes.map(q => q.image)
        ].filter(Boolean);

        urls.forEach(url => this.getImage(url));
    }

    /**
     * Obtiene o precarga un HTMLImageElement desde caché para Canvas o uso síncrono.
     * @param {string} url
     * @returns {HTMLImageElement}
     */
    getImage(url) {
        if (!url) return null;
        if (this.imagesCache.has(url)) {
            return this.imagesCache.get(url);
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        this.imagesCache.set(url, img);
        return img;
    }

    /* ------------------------------------------------------------------ */
    /* Selectores de Personaje y Ubicación Activa                         */
    /* ------------------------------------------------------------------ */

    getCharacters() {
        return this.characters;
    }

    getLocations() {
        return this.locations;
    }

    getQuotes() {
        return this.quotes;
    }

    getSelectedCharacter() {
        return this.characters.find(c => c.id === this.selectedCharacterId) || this.characters[0] || FALLBACK_CHARACTERS[0];
    }

    setSelectedCharacter(id) {
        const charId = Number(id);
        const found = this.characters.find(c => c.id === charId);
        if (found) {
            this.selectedCharacterId = charId;
            localStorage.setItem(this.STORAGE_CHAR, String(charId));
            return found;
        }
        return this.getSelectedCharacter();
    }

    getSelectedLocation() {
        return this.locations.find(l => l.id === this.selectedLocationId) || this.locations[0] || FALLBACK_LOCATIONS[0];
    }

    setSelectedLocation(id) {
        const locId = Number(id);
        const found = this.locations.find(l => l.id === locId);
        if (found) {
            this.selectedLocationId = locId;
            localStorage.setItem(this.STORAGE_LOC, String(locId));
            return found;
        }
        return this.getSelectedLocation();
    }

    /**
     * Devuelve una frase aleatoria del personaje activo (o del personaje indicado).
     */
    getRandomPhrase(characterName = null) {
        const char = characterName
            ? this.characters.find(c => c.name.toLowerCase().includes(characterName.toLowerCase()))
            : this.getSelectedCharacter();

        const phrases = char?.phrases || ["¡Woo-hoo!", "¡D'oh!", "Mmm... rosquillas..."];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    /**
     * Devuelve una cita aleatoria con personaje y sprite.
     */
    getRandomQuote() {
        if (!this.quotes || this.quotes.length === 0) {
            return FALLBACK_QUOTES[0];
        }
        return this.quotes[Math.floor(Math.random() * this.quotes.length)];
    }

    /**
     * Devuelve un avatar aleatorio de personaje para filas de rankings o decoración.
     */
    getRandomAvatar(seedIndex = 0) {
        if (this.characters.length === 0) return `${CDN_BASE}/500/character/1.webp`;
        const idx = Math.abs(seedIndex) % this.characters.length;
        return this.characters[idx].image;
    }
}

// Instancia única (Singleton)
export const simpsonsService = new SimpsonsService();

// Exposición global para interoperabilidad con scripts tradicionales (game.js, etc.)
if (typeof window !== 'undefined') {
    window.SimpsonsService = simpsonsService;
}
