/**
 * Motor del juego Snake — The Simpsons Springfield Edition.
 *
 * - Cabeza: Rostro de Homer Simpson (o personaje elegido de la API) rotando en dirección del movimiento.
 * - Cuerpo: Segmentos cartoon amarillos (#FED90F) con bordes cómic negros (#000).
 * - Comida normal: Rosquilla rosa con glaseado y virutas de colores (Donut).
 * - Comida bonus: Barra de plutonio radiactiva verde brillante (da puntos extra).
 * - Textos flotantes: Frases célebres del personaje al comer ("¡Woo-hoo!", "Mmm... rosquillas...").
 * - Lógica a paso fijo + interpolación a 60 FPS para máxima fluidez.
 */

class SnakeGame {
    initialSpeed = 140;
    maxSpeed = 65;
    speedStep = 2.5;

    static get GRID() {
        const stored = Number(localStorage.getItem('snake.gridSize'));
        return [8, 12, 16].includes(stored) ? stored : 12;
    }

    get grid() {
        return this.customGrid || SnakeGame.GRID;
    }

    static DIRS = {
        up: { x: 0, y: -1, angle: -Math.PI / 2 },
        down: { x: 0, y: 1, angle: Math.PI / 2 },
        left: { x: -1, y: 0, angle: Math.PI },
        right: { x: 1, y: 0, angle: 0 },
    };

    static OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

    // Paleta temática Springfield adaptada por escenario (colores vivos icónicos de Los Simpson)
    static LOCATION_THEMES = {
        // Casa de los Simpson (742 Evergreen Terrace) — El clásico azul cielo de Springfield
        1: { boardA: '#4BA3E3', boardB: '#3C92CE', gridLine: 'rgba(0, 0, 0, 0.12)', accent: '#FED90F' },
        // Central Nuclear (Sector 7G) — Verde radiactivo cartoon
        2: { boardA: '#1B5442', boardB: '#144334', gridLine: 'rgba(0, 0, 0, 0.18)', accent: '#7ED957' },
        // Escuela Primaria de Springfield — Verde pizarra de Bart
        3: { boardA: '#2A5A44', boardB: '#204634', gridLine: 'rgba(0, 0, 0, 0.18)', accent: '#FED90F' },
        // Kwik-E-Mart (El Badulaque) — Azul cian Springfield
        4: { boardA: '#20638F', boardB: '#184F73', gridLine: 'rgba(0, 0, 0, 0.15)', accent: '#70D1FE' },
        // Taberna de Moe — Verde taberna clásico
        5: { boardA: '#2C5138', boardB: '#223E2A', gridLine: 'rgba(0, 0, 0, 0.18)', accent: '#E67E22' },
    };

    static THEMES = {
        dark: {
            boardA: '#4BA3E3',
            boardB: '#3C92CE',
            gridLine: 'rgba(0, 0, 0, 0.12)',
            snakeBody: '#FED90F',
            snakeBorder: '#000000',
            snakeShine: 'rgba(255, 255, 255, 0.45)',
            donutDough: '#C88338',
            donutFrosting: '#FF69B4',
            plutonium: '#7ED957',
            plutoniumGlow: '#39FF14',
            shadow: 'rgba(0, 0, 0, 0.45)',
        },
        light: {
            boardA: '#5BBFEF',
            boardB: '#4BA3E3',
            gridLine: 'rgba(0, 0, 0, 0.12)',
            snakeBody: '#FED90F',
            snakeBorder: '#000000',
            snakeShine: 'rgba(255, 255, 255, 0.5)',
            donutDough: '#D28C42',
            donutFrosting: '#FF69B4',
            plutonium: '#56C534',
            plutoniumGlow: '#7ED957',
            shadow: 'rgba(0, 0, 0, 0.25)',
        },
    };

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {{onStart?:Function, onScore?:Function, onTime?:Function, onGameOver?:Function, onEat?:Function}} callbacks
     * @param {{walls?:string, theme?:string}} options
     */
    constructor(canvas, callbacks = {}, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cb = callbacks;
        this.walls = 'solid'; // Siempre paredes sólidas
        this.theme = options.theme || 'dark';
        this.customGrid = options.gridSize ? Number(options.gridSize) : SnakeGame.GRID;

        this.particles = [];
        this.bonusItem = null;
        this.bonusTimer = 0;

        this.loop = this.loop.bind(this);
        this.rafId = null;

        new ResizeObserver(() => this.resize()).observe(canvas);
        this.resize();
        this.reset();
    }

    setWallsMode() {
        this.walls = 'solid';
    }

    setTheme(theme) {
        this.theme = theme === 'light' ? 'light' : 'dark';
        if (this.canvas) this.render(1);
    }

    setLocation(location) {
        this.currentLocation = location;
        if (this.canvas) this.render(1);
    }

    setGridSize(size) {
        const val = Number(size);
        if ([8, 12, 16].includes(val)) {
            this.customGrid = val;
            if (this.state !== 'running') {
                this.reset();
            }
            if (this.canvas) this.render(1);
        }
    }

    get colors() {
        const base = SnakeGame.THEMES[this.theme] || SnakeGame.THEMES.dark;
        const locId = this.currentLocation?.id || window.SimpsonsService?.getSelectedLocation()?.id;
        const locTheme = SnakeGame.LOCATION_THEMES[locId];
        if (locTheme) {
            return { ...base, ...locTheme };
        }
        return base;
    }

    /* ------------------------------------------------------------------ */
    /* Estado                                                             */
    /* ------------------------------------------------------------------ */

    reset() {
        const mid = Math.floor(this.grid / 2);
        this.snake = [{ x: mid, y: mid }];
        this.prevSnake = this.snake.map(p => ({ ...p }));
        this.dir = null;
        this.queue = [];
        this.score = 0;
        this.donutsEaten = 0;
        this.elapsed = 0;
        this.accumulator = 0;
        this.lastFrame = 0;
        this.lastSecond = -1;
        this.particles = [];
        this.bonusItem = null;
        this.bonusTimer = 0;
        this.state = 'ready'; // ready | running | paused | over

        this.spawnApple();
        this.cb.onScore?.(0);
        this.cb.onTime?.(0);
    }

    get stepMs() {
        return Math.max(this.maxSpeed, this.initialSpeed - this.score * this.speedStep);
    }

    get seconds() {
        return Math.floor(this.elapsed / 1000);
    }

    start() {
        this.reset();
        this.lastFrame = performance.now();
        cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(this.loop);
    }

    stop() {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }

    pause() {
        if (this.state === 'running') this.state = 'paused';
    }

    resume() {
        if (this.state === 'paused') {
            this.state = 'running';
            this.lastFrame = performance.now();
        }
    }

    togglePause() {
        if (this.state === 'running') this.pause();
        else if (this.state === 'paused') this.resume();
        return this.state;
    }

    setDirection(name) {
        if (!SnakeGame.DIRS[name]) return;
        if (this.state === 'paused' || this.state === 'over') return;

        const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
        if (name === last) return;
        if (this.snake.length > 1 && name === SnakeGame.OPPOSITE[last]) return;
        if (this.queue.length >= 2) return;

        this.queue.push(name);
        window.soundEngine?.playTurn();

        if (this.state === 'ready') {
            this.state = 'running';
            this.lastFrame = performance.now();
            this.accumulator = this.stepMs;
            this.cb.onStart?.();
        }
    }

    spawnApple() {
        const free = [];
        const occupied = new Set(this.snake.map(p => `${p.x},${p.y}`));
        if (this.bonusItem) {
            occupied.add(`${this.bonusItem.x},${this.bonusItem.y}`);
        }

        for (let y = 0; y < this.grid; y++) {
            for (let x = 0; x < this.grid; x++) {
                if (!occupied.has(`${x},${y}`)) free.push({ x, y });
            }
        }

        if (free.length === 0) {
            this.apple = null;
            return false;
        }

        const cell = free[Math.floor(Math.random() * free.length)];
        this.apple = { ...cell, born: performance.now() };

        // Ocasionalmente spawnear barra de plutonio radiactiva (cada 4 rosquillas o 25% prob.)
        if (!this.bonusItem && this.score > 2 && Math.random() < 0.35) {
            this.spawnBonus(occupied);
        }

        return true;
    }

    spawnBonus(occupied) {
        const free = [];
        for (let y = 0; y < this.grid; y++) {
            for (let x = 0; x < this.grid; x++) {
                if (!occupied.has(`${x},${y}`) && (!this.apple || (this.apple.x !== x && this.apple.y !== y))) {
                    free.push({ x, y });
                }
            }
        }
        if (free.length > 0) {
            const cell = free[Math.floor(Math.random() * free.length)];
            this.bonusItem = {
                ...cell,
                born: performance.now(),
                duration: 9000, // 9 segundos para recoger la barra de plutonio
                points: 3
            };
        }
    }

    /* ------------------------------------------------------------------ */
    /* Lógica de juego                                                    */
    /* ------------------------------------------------------------------ */

    step() {
        if (this.queue.length) this.dir = this.queue.shift();
        if (!this.dir) return;

        const d = SnakeGame.DIRS[this.dir];
        const head = this.snake[0];
        let next = { x: head.x + d.x, y: head.y + d.y };

        // Colisión con paredes sólidas
        if (next.x < 0 || next.y < 0 || next.x >= this.grid || next.y >= this.grid) {
            return this.die();
        }

        const eatsApple = this.apple && next.x === this.apple.x && next.y === this.apple.y;
        const eatsBonus = this.bonusItem && next.x === this.bonusItem.x && next.y === this.bonusItem.y;

        // Choque consigo misma
        const body = (eatsApple || eatsBonus) ? this.snake : this.snake.slice(0, -1);
        if (body.some(p => p.x === next.x && p.y === next.y)) {
            return this.die();
        }

        this.prevSnake = this.snake.map(p => ({ ...p }));
        this.snake.unshift(next);

        if (eatsApple) {
            this.score++;
            this.donutsEaten++;
            this.burstDonut(next.x, next.y);
            window.soundEngine?.playEat();

            this.cb.onScore?.(this.score);
            this.cb.onEat?.(this.score);

            if (!this.spawnApple()) {
                return this.die(true);
            }
        } else if (eatsBonus) {
            this.score += this.bonusItem.points;
            this.burstPlutonium(next.x, next.y);
            window.soundEngine?.playBonus();

            this.bonusItem = null;
            this.cb.onScore?.(this.score);
        } else {
            this.snake.pop();
        }
    }

    die(won = false) {
        this.state = 'over';
        window.soundEngine?.playCrash();
        this.prevSnake = this.snake.map(p => ({ ...p }));
        this.render(1);
        this.cb.onGameOver?.({
            score: this.score,
            donuts: this.donutsEaten,
            time: this.seconds,
            length: this.snake.length,
            won,
            gridSize: this.grid,
        });
    }

    loop(now) {
        this.rafId = requestAnimationFrame(this.loop);
        const dt = Math.min(now - this.lastFrame, 250);
        this.lastFrame = now;

        if (this.state === 'running') {
            this.elapsed += dt;
            this.accumulator += dt;

            // Caducidad de la barra de plutonio
            if (this.bonusItem) {
                if (now - this.bonusItem.born > this.bonusItem.duration) {
                    this.bonusItem = null;
                }
            }

            while (this.accumulator >= this.stepMs && this.state === 'running') {
                this.accumulator -= this.stepMs;
                this.step();
            }

            if (this.seconds !== this.lastSecond) {
                this.lastSecond = this.seconds;
                this.cb.onTime?.(this.seconds);
            }
        }

        this.updateParticles(dt);

        const alpha = this.state === 'running' ? Math.min(this.accumulator / this.stepMs, 1) : 1;
        this.render(alpha);
    }

    /* ------------------------------------------------------------------ */
    /* Renderizado Canvas                                                 */
    /* ------------------------------------------------------------------ */

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const size = Math.round(this.canvas.clientWidth * dpr);
        if (size > 0 && this.canvas.width !== size) {
            this.canvas.width = size;
            this.canvas.height = size;
            if (this.snake) this.render(1);
        }
    }

    get cell() {
        return this.canvas.width / this.grid;
    }

    segmentPos(i, alpha) {
        const from = this.prevSnake[i] || this.snake[i] || { x: 0, y: 0 };
        const to = this.snake[i] || from;

        return {
            x: from.x + (to.x - from.x) * alpha,
            y: from.y + (to.y - from.y) * alpha,
        };
    }

    render(alpha) {
        const { ctx } = this;
        const c = this.cell;

        this.drawBoard();
        if (this.bonusItem) this.drawPlutonium();
        if (this.apple) this.drawDonut();
        this.drawSnake(alpha);
        this.drawParticles();

        if (this.state === 'over') {
            ctx.fillStyle = 'rgba(255, 69, 58, 0.25)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawBoard() {
        const { ctx } = this;
        const c = this.cell;
        const C = this.colors;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = C.boardA;
        ctx.fillRect(0, 0, w, h);

        // Cuadrícula ajedrezada cartoon con alineación exacta de píxeles
        ctx.fillStyle = C.boardB;
        for (let y = 0; y < this.grid; y++) {
            const y0 = Math.round(y * c);
            const y1 = Math.round((y + 1) * c);
            const tileH = y1 - y0;
            for (let x = (y % 2); x < this.grid; x += 2) {
                const x0 = Math.round(x * c);
                const x1 = Math.round((x + 1) * c);
                const tileW = x1 - x0;
                ctx.fillRect(x0, y0, tileW, tileH);
            }
        }

        // Líneas sutiles de cuadrícula cómic (sin puntos rosas ni artefactos en las esquinas)
        if (C.gridLine) {
            ctx.strokeStyle = C.gridLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= this.grid; i++) {
                const pos = Math.round(i * c);
                // Línea vertical
                ctx.moveTo(pos, 0);
                ctx.lineTo(pos, h);
                // Línea horizontal
                ctx.moveTo(0, pos);
                ctx.lineTo(w, pos);
            }
            ctx.stroke();
        }
    }

    /**
     * Dibuja la Rosquilla Rosa con Glaseado y Virutas de Los Simpson.
     */
    drawDonut() {
        const { ctx } = this;
        const c = this.cell;
        const now = performance.now();

        const born = Math.min((now - this.apple.born) / 250, 1);
        const easeOut = 1 - Math.pow(1 - born, 3);
        const pulse = 1 + Math.sin(now / 180) * 0.05;
        const r = c * 0.42 * easeOut * pulse;

        const cx = (this.apple.x + 0.5) * c;
        const cy = (this.apple.y + 0.5) * c;

        ctx.save();

        // 1. Sombra cómic dura estilo cartoon
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx + 2, cy + r * 0.85, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Base de Masa de Donut (Marrón dorado / masa frita) con borde negro cómic
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#C88338';
        ctx.fill();
        ctx.lineWidth = Math.max(2.5, c * 0.06);
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // 3. Glaseado Rosa Simpsons (Frosting ondulado)
        const frostR = r * 0.88;
        ctx.beginPath();
        const waves = 12;
        for (let i = 0; i <= waves; i++) {
            const angle = (i / waves) * Math.PI * 2;
            const waveOffset = Math.sin(angle * 5) * (frostR * 0.12);
            const dist = frostR + waveOffset;
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = '#FF69B4';
        ctx.fill();

        // 4. Agujero central del Donut
        const holeR = r * 0.34;
        ctx.beginPath();
        ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.boardA;
        ctx.fill();
        ctx.lineWidth = Math.max(2.2, c * 0.05);
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // 5. Virutas de colores (Sprinkles) estilo Simpsons
        const sprinkles = [
            { a: 0.3, d: 0.62, col: '#00FFFF', rot: 0.4 },
            { a: 0.9, d: 0.65, col: '#FED90F', rot: 1.2 },
            { a: 1.5, d: 0.60, col: '#FFFFFF', rot: 2.1 },
            { a: 2.2, d: 0.68, col: '#7ED957', rot: 0.8 },
            { a: 2.8, d: 0.58, col: '#FF4757', rot: 1.7 },
            { a: 3.5, d: 0.66, col: '#FED90F', rot: 2.6 },
            { a: 4.2, d: 0.62, col: '#FFFFFF', rot: 0.2 },
            { a: 4.8, d: 0.65, col: '#00FFFF', rot: 1.1 },
            { a: 5.4, d: 0.59, col: '#7ED957', rot: 2.3 },
            { a: 6.0, d: 0.67, col: '#FF4757', rot: 0.6 },
        ];

        sprinkles.forEach(s => {
            const sx = cx + Math.cos(s.a) * (r * s.d);
            const sy = cy + Math.sin(s.a) * (r * s.d);
            const sw = c * 0.09;
            const sh = c * 0.035;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(s.rot);
            ctx.fillStyle = s.col;
            ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
            ctx.restore();
        });

        // 6. Brillo del glaseado
        ctx.beginPath();
        ctx.arc(cx - r * 0.4, cy - r * 0.4, r * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fill();

        ctx.restore();
    }

    /**
     * Dibuja la Barra de Plutonio Radiactiva (Bonus Item).
     */
    drawPlutonium() {
        const { ctx } = this;
        const c = this.cell;
        const now = performance.now();
        const p = this.bonusItem;

        const pulse = 1 + Math.sin(now / 110) * 0.08;
        const cx = (p.x + 0.5) * c;
        const cy = (p.y + 0.5) * c;
        const w = c * 0.32 * pulse;
        const h = c * 0.72 * pulse;

        ctx.save();

        // Resplandor radiactivo verde intenso
        ctx.shadowColor = '#39FF14';
        ctx.shadowBlur = c * 0.4;

        // Cilindro de plutonio
        ctx.fillStyle = '#7ED957';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, c * 0.05);

        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, [6]);
        ctx.fill();
        ctx.stroke();

        // Bandas metálicas de seguridad
        ctx.fillStyle = '#E67E22';
        ctx.fillRect(cx - w / 2, cy - h * 0.3, w, h * 0.12);
        ctx.strokeRect(cx - w / 2, cy - h * 0.3, w, h * 0.12);
        ctx.fillRect(cx - w / 2, cy + h * 0.18, w, h * 0.12);
        ctx.strokeRect(cx - w / 2, cy + h * 0.18, w, h * 0.12);

        // Brillo nuclear blanco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - w * 0.3, cy - h * 0.42, w * 0.2, h * 0.84);

        ctx.restore();
    }

    /**
     * Renderizado de la Serpiente Simpsons:
     * - Cabeza: Rostro del personaje (Homer Simpson / API) con orientación.
     * - Cuerpo: Segmentos amarillos (#FED90F) con bordes gruesos de cómic (#000).
     */
    drawSnake(alpha) {
        const { ctx } = this;
        const c = this.cell;
        const n = this.snake.length;
        const now = performance.now();

        const pts = [];
        for (let i = 0; i < n; i++) {
            const p = this.segmentPos(i, alpha);
            pts.push({ x: (p.x + 0.5) * c, y: (p.y + 0.5) * c });
        }

        const baseWidth = c * 0.82;

        // 1. Sombra cómic para elevación del cuerpo
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = c * 0.25;
        ctx.shadowOffsetY = c * 0.08;

        // 2. Trazo base del cuerpo (Borde exterior negro de cómic)
        for (let i = n - 1; i >= 1; i--) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = baseWidth + Math.max(3, c * 0.08);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
            ctx.stroke();
        }

        // 3. Relleno amarillo Simpson (#FED90F) del cuerpo
        for (let i = n - 1; i >= 1; i--) {
            ctx.strokeStyle = '#FED90F';
            ctx.lineWidth = baseWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
            ctx.stroke();
        }
        ctx.restore();

        // 4. Articulaciones y detalles de rosquilla/cartoon en cada segmento
        for (let i = n - 1; i >= 1; i--) {
            const pt = pts[i];
            const r = baseWidth * 0.5;

            ctx.save();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#FED90F';
            ctx.fill();
            ctx.lineWidth = Math.max(2.5, c * 0.06);
            ctx.strokeStyle = '#000000';
            ctx.stroke();

            // Reflejo blanco cartoon en el lomo
            ctx.beginPath();
            ctx.arc(pt.x - r * 0.28, pt.y - r * 0.28, r * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fill();

            ctx.restore();
        }

        // 5. Cabeza de la serpiente: Homer Simpson o personaje seleccionado
        this.drawSnakeHead(pts[0], pts[1] || null);
    }

    /**
     * Dibuja la cabeza de la serpiente con el avatar del personaje de Los Simpson.
     */
    drawSnakeHead(headPt, neckPt) {
        const { ctx } = this;
        const c = this.cell;
        const size = c * 1.1;
        const r = size * 0.48;

        // Calcular ángulo de dirección
        let angle = 0;
        if (this.dir && SnakeGame.DIRS[this.dir]) {
            angle = SnakeGame.DIRS[this.dir].angle;
        } else if (neckPt) {
            angle = Math.atan2(headPt.y - neckPt.y, headPt.x - neckPt.x);
        }

        ctx.save();
        ctx.translate(headPt.x, headPt.y);

        // Obtener el personaje activo desde SimpsonsService
        const activeChar = window.SimpsonsService?.getSelectedCharacter();
        const avatarImg = activeChar?.image ? window.SimpsonsService.getImage(activeChar.image) : null;

        // Borde circular estilo chapa / cómic
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#FED90F';
        ctx.fill();
        ctx.lineWidth = Math.max(3, c * 0.08);
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        ctx.clip();

        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
            // Renderizar rostro del personaje rotando sutilmente con la dirección
            ctx.rotate(angle * 0.15); // Rotación sutil para mantener el rostro reconocible
            ctx.drawImage(avatarImg, -r, -r, r * 2, r * 2);
        } else {
            // Fallback vectorial de Homer Simpson si la imagen tarda en cargar
            this.drawVectorHomerHead(ctx, r);
        }
        ctx.restore();

        // Marco exterior reforzado de cómic
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(3, c * 0.07);
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Fallback vectorial instantáneo del rostro de Homer Simpson con ojos saltones y boca marrón.
     */
    drawVectorHomerHead(ctx, r) {
        // Fondo amarillo piel Simpson
        ctx.fillStyle = '#FED90F';
        ctx.fillRect(-r, -r, r * 2, r * 2);

        // Hocico / Barba marrón clásica
        ctx.beginPath();
        ctx.ellipse(r * 0.1, r * 0.25, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#D1A354';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ojo izquierdo
        ctx.beginPath();
        ctx.arc(-r * 0.22, -r * 0.12, r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.stroke();
        // Pupila izquierda
        ctx.beginPath();
        ctx.arc(-r * 0.16, -r * 0.12, r * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Ojo derecho
        ctx.beginPath();
        ctx.arc(r * 0.22, -r * 0.12, r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.stroke();
        // Pupila derecha
        ctx.beginPath();
        ctx.arc(r * 0.16, -r * 0.12, r * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Nariz redonda
        ctx.beginPath();
        ctx.arc(0, 0.05 * r, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#FED90F';
        ctx.fill();
        ctx.stroke();
    }

    /* ------------------------------------------------------------------ */
    /* Partículas y Textos Flotantes                                      */
    /* ------------------------------------------------------------------ */

    burstDonut(gx, gy) {
        const c = this.cell;
        const cx = (gx + 0.5) * c;
        const cy = (gy + 0.5) * c;
        const colors = ['#FF69B4', '#FED90F', '#00FFFF', '#FFFFFF', '#7ED957'];

        for (let i = 0; i < 22; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = (0.05 + Math.random() * 0.14) * c;
            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                life: 1,
                size: c * (0.05 + Math.random() * 0.07),
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    }

    burstPlutonium(gx, gy) {
        const c = this.cell;
        const cx = (gx + 0.5) * c;
        const cy = (gy + 0.5) * c;

        for (let i = 0; i < 28; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = (0.06 + Math.random() * 0.18) * c;
            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                life: 1,
                size: c * (0.06 + Math.random() * 0.09),
                color: Math.random() < 0.6 ? '#7ED957' : '#39FF14',
            });
        }
    }

    updateParticles(dt) {
        const k = dt / 16.67;
        for (const p of this.particles) {
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.life -= 0.032 * k;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }

    drawParticles() {
        const { ctx } = this;
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(p.life, 0);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life + 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

window.SnakeGame = SnakeGame;
