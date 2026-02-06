declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => Promise<void> | void
  }
}

export function setRenderGameToText(builder: () => Record<string, unknown>): void {
  window.render_game_to_text = () => JSON.stringify(builder())
}

export function clearRenderGameToText(): void {
  delete window.render_game_to_text
}
