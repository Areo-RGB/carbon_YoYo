import type { TestType } from '../domain/protocol.ts';

const YOYO_AUDIO = '/assets/audio/audio.mp3';
const BEEP_AUDIO = '/assets/audio/beep_test.m4a';

/**
 * Offset between the Beep Test media timeline and protocol time.
 * The first actual test beep sounds at audio 00:10.215, which is the start
 * of Level 1 Shuttle 1 (test time 00:00.000).
 */
export const BEEP_TEST_OFFSET_MS = 10_215;

/**
 * Protocol clock driven by the bundled audio files:
 * - Yo-Yo IR1 uses audio.mp3 as the authoritative clock.
 * - Beep Test uses beep_test.m4a as the authoritative clock, mapped to
 *   protocol time by subtracting BEEP_TEST_OFFSET_MS.
 */
export class ProtocolAudioClock {
  private audio = new Audio();
  private context?: AudioContext;
  private gain?: GainNode;
  private source?: MediaElementAudioSourceNode;
  private boost = 1;
  private enabled = true;
  private mode: TestType = 'yoyoIR1';
  private fallbackStartedAt = 0;
  private fallbackOffsetMs = 0;
  private playing = false;

  constructor() {
    this.audio.preload = 'auto';
  }

  private audioFor(type: TestType): string {
    return type === 'yoyoIR1' ? YOYO_AUDIO : BEEP_AUDIO;
  }

  async load(type: TestType): Promise<void> {
    this.mode = type;
    await this.ensureGraph();
    const src = this.audioFor(type);
    if (this.audio.getAttribute('src') !== src) {
      this.audio.pause();
      this.audio.src = src;
      this.audio.load();
    }
  }

  private async ensureGraph(): Promise<void> {
    if (this.context) return;
    const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.gain = this.context.createGain();
    this.gain.connect(this.context.destination);
    this.source = this.context.createMediaElementSource(this.audio);
    this.source.connect(this.gain);
    this.updateGain();
  }

  private updateGain(): void {
    if (this.gain) this.gain.gain.value = this.enabled ? this.boost : 0;
    else this.audio.volume = this.enabled ? Math.min(1, this.boost) : 0;
  }

  setSoundEnabled(enabled: boolean): void {
    // Muting never pauses timing. It only changes gain.
    this.enabled = enabled;
    this.updateGain();
  }

  setBoost(boost: number): void {
    this.boost = Math.min(3, Math.max(1, boost));
    this.updateGain();
  }

  async start(type: TestType): Promise<void> {
    await this.load(type);
    if (this.context?.state === 'suspended') await this.context.resume();
    this.fallbackOffsetMs = 0;
    this.fallbackStartedAt = performance.now();
    this.playing = true;

    this.audio.currentTime = 0;
    try {
      await this.audio.play();
    } catch (error) {
      console.warn('Protocol audio playback did not start; using monotonic fallback clock', error);
    }
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') await this.context.resume();
    this.fallbackStartedAt = performance.now();
    this.playing = true;

    // Seek the media back to the paused protocol position (re-adding the
    // Beep Test intro offset) so beeps and UI stay aligned after a pause.
    const audioSeconds = this.mode === 'beepTest'
      ? (this.fallbackOffsetMs + BEEP_TEST_OFFSET_MS) / 1000
      : this.fallbackOffsetMs / 1000;
    if (Number.isFinite(audioSeconds) && audioSeconds >= 0) {
      try { this.audio.currentTime = audioSeconds; } catch { /* keep current position */ }
    }
    try { await this.audio.play(); } catch { /* fallback clock remains valid */ }
  }

  pause(): void {
    this.fallbackOffsetMs = this.elapsedMs();
    this.playing = false;
    this.audio.pause();
  }

  stop(): void {
    this.fallbackOffsetMs = 0;
    this.playing = false;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  elapsedMs(): number {
    if (!this.audio.paused && Number.isFinite(this.audio.currentTime)) {
      const audioMs = Math.max(0, this.audio.currentTime * 1000);
      if (this.mode === 'beepTest') {
        // Clamp the pre-start intro to test time zero (Level 1 Shuttle 1).
        return Math.max(0, audioMs - BEEP_TEST_OFFSET_MS);
      }
      return audioMs;
    }
    return this.fallbackOffsetMs + (this.playing ? performance.now() - this.fallbackStartedAt : 0);
  }
}
