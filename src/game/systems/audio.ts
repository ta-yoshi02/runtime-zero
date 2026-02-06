type SfxEvent =
  | 'jump'
  | 'land'
  | 'collect'
  | 'gem'
  | 'hit'
  | 'shoot'
  | 'sudo'
  | 'warp'
  | 'checkpoint'
  | 'goal'
  | 'enemy_die'
  | 'pause'
  | 'menu_move'
  | 'menu_confirm'

function canUseAudio(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined'
}

class RuntimeAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private bgmTimer: number | null = null
  private bgmStep = 0

  private ensureContext(): boolean {
    if (!canUseAudio()) {
      return false
    }

    if (!this.context) {
      this.context = new window.AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.06
      this.master.connect(this.context.destination)
    }

    if (this.context.state === 'suspended') {
      void this.context.resume()
    }

    return true
  }

  play(event: SfxEvent): void {
    if (!this.ensureContext() || !this.context || !this.master) {
      return
    }

    const now = this.context.currentTime

    const config = {
      jump: { f: 540, f2: 720, d: 0.09, t: 'triangle' as OscillatorType },
      land: { f: 220, f2: 140, d: 0.08, t: 'square' as OscillatorType },
      collect: { f: 720, f2: 900, d: 0.1, t: 'sine' as OscillatorType },
      gem: { f: 620, f2: 1080, d: 0.18, t: 'triangle' as OscillatorType },
      hit: { f: 180, f2: 90, d: 0.14, t: 'sawtooth' as OscillatorType },
      shoot: { f: 840, f2: 640, d: 0.08, t: 'square' as OscillatorType },
      sudo: { f: 540, f2: 1360, d: 0.22, t: 'triangle' as OscillatorType },
      warp: { f: 300, f2: 980, d: 0.16, t: 'sine' as OscillatorType },
      checkpoint: { f: 420, f2: 760, d: 0.15, t: 'triangle' as OscillatorType },
      goal: { f: 520, f2: 1260, d: 0.24, t: 'triangle' as OscillatorType },
      enemy_die: { f: 660, f2: 250, d: 0.13, t: 'square' as OscillatorType },
      pause: { f: 270, f2: 250, d: 0.1, t: 'sine' as OscillatorType },
      menu_move: { f: 400, f2: 440, d: 0.05, t: 'sine' as OscillatorType },
      menu_confirm: { f: 500, f2: 760, d: 0.08, t: 'triangle' as OscillatorType },
    }[event]

    const osc = this.context.createOscillator()
    const gain = this.context.createGain()

    osc.type = config.t
    osc.frequency.setValueAtTime(config.f, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, config.f2), now + config.d)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.d)

    osc.connect(gain)
    gain.connect(this.master)

    osc.start(now)
    osc.stop(now + config.d + 0.03)
  }

  startStageLoop(stageIndex: number): void {
    if (!this.ensureContext() || !this.context || !this.master) {
      return
    }

    this.stopStageLoop()

    const roots = [196, 208, 220, 233, 247, 262, 277, 294]
    const root = roots[(stageIndex - 1 + roots.length) % roots.length]
    const pattern = [0, 3, 5, 7, 10, 7, 5, 3]

    this.bgmStep = 0
    this.bgmTimer = window.setInterval(() => {
      if (!this.context || !this.master) {
        return
      }

      const now = this.context.currentTime
      const offset = pattern[this.bgmStep % pattern.length]
      const freq = root * Math.pow(2, offset / 12)

      const osc = this.context.createOscillator()
      const gain = this.context.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

      osc.connect(gain)
      gain.connect(this.master)
      osc.start(now)
      osc.stop(now + 0.31)

      this.bgmStep += 1
    }, 340)
  }

  stopStageLoop(): void {
    if (this.bgmTimer) {
      window.clearInterval(this.bgmTimer)
      this.bgmTimer = null
    }
  }
}

export const runtimeAudio = new RuntimeAudio()
