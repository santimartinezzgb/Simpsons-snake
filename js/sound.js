/**
 * Motor de audio procedural estilo cartoon / arcade usando Web Audio API.
 * Efectos de sonido minimalistas inspirados en dibujos animados sin librerías externas.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('snake.sound') !== 'false';
    }

    _init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        localStorage.setItem('snake.sound', this.enabled ? 'true' : 'false');
    }

    /** Sonido alegre al comer una rosquilla (Chomp / Boing cartoon) */
    playEat() {
        if (!this.enabled) return;
        this._init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        // Tono ascendente juguetón (E5 -> B5 -> E6)
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.09);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    /** Sonido especial radiactivo / item de plutonio */
    playBonus() {
        if (!this.enabled) return;
        this._init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(1760, now + 0.1);
        osc.frequency.linearRampToValueAtTime(2200, now + 0.22);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    /** Sonido de colisión / Game Over (estilo cartoon D'oh! / bonk) */
    playCrash() {
        if (!this.enabled) return;
        this._init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
    }

    /** Clic sutil para giros de dirección */
    playTurn() {
        if (!this.enabled) return;
        this._init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.035);
    }
}

window.soundEngine = new SoundEngine();
