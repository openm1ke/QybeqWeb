export interface AudioSettings {
  musicEnabled: boolean
  effectsEnabled: boolean
  musicVolume: number
}

const settingsKey = 'qybeq.audio.v1'
const musicTracks = ['./audio/quiet_geometry.mp3', './audio/glass_horizon.mp3', './audio/soft_circuit.mp3']
const effects = {
  dice: ['./audio/dice_roll.wav', .34],
  pickup: ['./audio/piece_pickup.wav', .38],
  place: ['./audio/piece_place.wav', .48],
  turn: ['./audio/piece_turn.wav', .34],
  reject: ['./audio/piece_reject.wav', .38],
  complete: ['./audio/puzzle_complete.wav', .58],
} as const

export function loadAudioSettings(): AudioSettings {
  try {
    const value = JSON.parse(localStorage.getItem(settingsKey) ?? '{}') as Partial<AudioSettings>
    return {
      musicEnabled: value.musicEnabled ?? true,
      effectsEnabled: value.effectsEnabled ?? true,
      musicVolume: typeof value.musicVolume === 'number' ? Math.max(0, Math.min(1, value.musicVolume)) : .5,
    }
  } catch {
    return { musicEnabled: true, effectsEnabled: true, musicVolume: .5 }
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try { localStorage.setItem(settingsKey, JSON.stringify(settings)) } catch { /* Optional storage. */ }
}

class WebGameAudio {
  private settings = loadAudioSettings()
  private music = new Audio(musicTracks[0])
  private trackIndex = 0
  private unlocked = false
  private appActive = !document.hidden

  constructor() {
    this.music.preload = 'none'
    this.music.addEventListener('ended', () => this.nextTrack())
    document.addEventListener('visibilitychange', () => {
      this.appActive = !document.hidden
      void this.syncMusic()
    })
  }

  configure(settings: AudioSettings): void {
    this.settings = settings
    this.music.volume = settings.musicVolume * .32
    if (this.unlocked) void this.syncMusic()
  }

  unlock(): void {
    if (this.unlocked) return
    this.unlocked = true
    void this.syncMusic()
  }

  private async syncMusic(): Promise<void> {
    if (!this.unlocked) return
    if (!this.settings.musicEnabled || !this.appActive) {
      this.music.pause()
      return
    }
    this.music.volume = this.settings.musicVolume * .32
    try { await this.music.play() } catch { /* Browser playback can be unavailable. */ }
  }

  private nextTrack(): void {
    this.trackIndex = (this.trackIndex + 1) % musicTracks.length
    this.music.src = musicTracks[this.trackIndex]
    void this.syncMusic()
  }

  playEffect(name: keyof typeof effects): void {
    if (!this.settings.effectsEnabled || !this.appActive || !this.unlocked) return
    const [source, volume] = effects[name]
    const player = new Audio(source)
    player.volume = volume
    void player.play().catch(() => undefined)
  }
}

export const gameAudio = new WebGameAudio()
