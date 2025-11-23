export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private bgm: HTMLAudioElement;
  private engineGain: GainNode | null = null;
  private engineSource: AudioBufferSourceNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineLfo: OscillatorNode | null = null; // For the "wobble"
  private ambienceSource: AudioBufferSourceNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.4;

    this.bgm = new Audio();
    this.bgm.loop = true;
    this.bgm.volume = 0.25;
    this.bgm.crossOrigin = "anonymous";
  }

  async init(musicUrl: string) {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    this.bgm.src = musicUrl;
    this.playMusic();
    this.startAmbience();
  }

  playMusic() {
    if (!this.isMuted) {
      this.bgm.play().catch(e => console.warn("Music play failed:", e));
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
      this.bgm.pause();
    } else {
      this.masterGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.1);
      this.bgm.play().catch(() => {});
    }
    return this.isMuted;
  }

  // --- SYNTHESIZED SFX ---

  private createOscillator(type: OscillatorType, freq: number, duration: number, vol: number = 0.1, startTime: number = 0) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration + 0.1);
  }

  playClick() {
    // Sci-fi "Blip"
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playHover() {
    // Quick high chirp
    this.createOscillator('sine', 1800, 0.03, 0.02);
  }

  playAccept() {
    // Sci-fi Major Chord Arp
    this.createOscillator('triangle', 523.25, 0.3, 0.1, 0);   // C5
    this.createOscillator('triangle', 659.25, 0.3, 0.1, 0.08); // E5
    this.createOscillator('triangle', 783.99, 0.4, 0.1, 0.16); // G5
    // Add a sparkle
    this.createOscillator('sine', 1046.50, 0.4, 0.05, 0.24); // C6
  }

  playError() {
    // Dissonant Buzz
    this.createOscillator('sawtooth', 110, 0.4, 0.2);
    this.createOscillator('square', 116, 0.4, 0.2); // Tritone-ish clash
  }

  playCash() {
    // Retro computer "Credit" sound
    this.createOscillator('square', 880, 0.1, 0.1, 0);
    this.createOscillator('square', 1760, 0.1, 0.1, 0.05);
  }

  playAlert() {
    // Sci-Fi Alarm (Theremin-ish slide)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // --- LOOPS ---

  startEngine() {
    if (this.engineSource) return;

    // 1. Rumble Background
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    this.engineSource = this.ctx.createBufferSource();
    this.engineSource.buffer = buffer;
    this.engineSource.loop = true;

    // Lowpass for rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 80;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.engineGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 1);

    this.engineSource.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    // 2. "Saucer" Wobble (Theremin/UFO sound)
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sine';
    this.engineOsc.frequency.value = 120; // Base pitch
    
    // LFO for the "woo-woo-woo" effect
    this.engineLfo = this.ctx.createOscillator();
    this.engineLfo.frequency.value = 5; // 5 Hz wobble speed
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 15; // Wobble depth (Hz)
    
    this.engineLfo.connect(lfoGain);
    lfoGain.connect(this.engineOsc.frequency);

    const oscGain = this.ctx.createGain();
    oscGain.gain.value = 0.08;
    
    this.engineOsc.connect(oscGain);
    oscGain.connect(this.engineGain); // Route through main engine gain

    this.engineSource.start();
    this.engineOsc.start();
    this.engineLfo.start();
  }

  stopEngine() {
    if (this.engineGain) {
        this.engineGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        setTimeout(() => {
            if (this.engineSource) { this.engineSource.stop(); this.engineSource = null; }
            if (this.engineOsc) { this.engineOsc.stop(); this.engineOsc = null; }
            if (this.engineLfo) { this.engineLfo.stop(); this.engineLfo = null; }
            this.engineGain = null;
        }, 500);
    }
  }

  // Deep Space Ambience
  startAmbience() {
    if (this.ambienceSource) return;

    // Pink noiseish
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate for gain loss
    }

    this.ambienceSource = this.ctx.createBufferSource();
    this.ambienceSource.buffer = buffer;
    this.ambienceSource.loop = true;

    // Highpass to remove mud, keep the "hiss" of space
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 500;
    
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;

    this.ambienceSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    this.ambienceSource.start();
  }
}