export type InputAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'run'
  | 'fire'
  | 'confirm'
  | 'cancel'
  | 'pause'
  | 'restart'
  | 'tuning'

export type KeyBindingMap = Record<InputAction, string[]>

const STORAGE_KEY = 'runtime-zero:keybinds:v1'

const DEFAULT_BINDINGS: KeyBindingMap = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  jump: ['SPACE', 'UP', 'W'],
  run: ['SHIFT', 'X'],
  fire: ['Z', 'J'],
  confirm: ['ENTER', 'SPACE'],
  cancel: ['ESC'],
  pause: ['P'],
  restart: ['R'],
  tuning: ['F1'],
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeKey(key: string): string {
  return key.trim().toUpperCase()
}

function uniqueKeys(keys: string[]): string[] {
  const normalized = keys.map(normalizeKey).filter((key) => key.length > 0)
  return Array.from(new Set(normalized))
}

class KeybindStore {
  private bindings: KeyBindingMap

  constructor() {
    this.bindings = this.load()
  }

  get(action: InputAction): string[] {
    const keys = this.bindings[action] ?? DEFAULT_BINDINGS[action]
    return keys.length > 0 ? [...keys] : [...DEFAULT_BINDINGS[action]]
  }

  getAll(): KeyBindingMap {
    return {
      left: this.get('left'),
      right: this.get('right'),
      up: this.get('up'),
      down: this.get('down'),
      jump: this.get('jump'),
      run: this.get('run'),
      fire: this.get('fire'),
      confirm: this.get('confirm'),
      cancel: this.get('cancel'),
      pause: this.get('pause'),
      restart: this.get('restart'),
      tuning: this.get('tuning'),
    }
  }

  setPrimary(action: InputAction, key: string): void {
    const normalized = normalizeKey(key)
    if (!normalized) {
      return
    }

    const merged = uniqueKeys([normalized, ...DEFAULT_BINDINGS[action]])
    this.bindings[action] = merged.slice(0, 3)
    this.save()
  }

  reset(): void {
    this.bindings = this.cloneDefaults()
    this.save()
  }

  private cloneDefaults(): KeyBindingMap {
    return {
      left: [...DEFAULT_BINDINGS.left],
      right: [...DEFAULT_BINDINGS.right],
      up: [...DEFAULT_BINDINGS.up],
      down: [...DEFAULT_BINDINGS.down],
      jump: [...DEFAULT_BINDINGS.jump],
      run: [...DEFAULT_BINDINGS.run],
      fire: [...DEFAULT_BINDINGS.fire],
      confirm: [...DEFAULT_BINDINGS.confirm],
      cancel: [...DEFAULT_BINDINGS.cancel],
      pause: [...DEFAULT_BINDINGS.pause],
      restart: [...DEFAULT_BINDINGS.restart],
      tuning: [...DEFAULT_BINDINGS.tuning],
    }
  }

  private load(): KeyBindingMap {
    const defaults = this.cloneDefaults()
    if (!canUseStorage()) {
      return defaults
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return defaults
      }

      const parsed = JSON.parse(raw) as Partial<KeyBindingMap>
      if (!parsed || typeof parsed !== 'object') {
        return defaults
      }

      ;(Object.keys(defaults) as InputAction[]).forEach((action) => {
        const candidate = parsed[action]
        if (!Array.isArray(candidate)) {
          return
        }

        const cleaned = uniqueKeys(candidate.filter((item) => typeof item === 'string'))
        if (cleaned.length > 0) {
          defaults[action] = cleaned.slice(0, 3)
        }
      })
    } catch {
      return defaults
    }

    return defaults
  }

  private save(): void {
    if (!canUseStorage()) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings))
    } catch {
      // ignore storage errors
    }
  }
}

export const keybindStore = new KeybindStore()
