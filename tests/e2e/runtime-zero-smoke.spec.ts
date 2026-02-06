import { expect, test } from '@playwright/test'

async function readState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const text = window.render_game_to_text?.() ?? '{}'
    return JSON.parse(text)
  })
}

test('title -> menu -> stage select -> gameplay -> pause/exit -> result', async ({ page }) => {
  const consoleErrors = [] as string[]
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  await page.goto('/')
  await page.waitForSelector('canvas')

  let state = await readState(page)
  expect(state.mode).toBe('title')

  await page.keyboard.press('Enter')
  state = await readState(page)
  expect(state.mode).toBe('main_menu')

  await page.keyboard.press('Enter')
  state = await readState(page)
  expect(state.mode).toBe('stage_select')

  await page.keyboard.press('Enter')
  state = await readState(page)
  expect(state.mode).toBe('ingame')

  await page.keyboard.down('ArrowRight')
  for (let i = 0; i < 5; i += 1) {
    await page.waitForTimeout(350)
    await page.keyboard.press('Space')
  }
  await page.keyboard.up('ArrowRight')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(120)
  await page.keyboard.press('Enter')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(120)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  state = await readState(page)
  expect(state.mode).toBe('stage_select')

  await page.keyboard.press('Enter')
  state = await readState(page)
  expect(state.mode).toBe('ingame')

  // Test-only assisted clear path in prototype.
  await page.keyboard.press('k')
  await page.waitForTimeout(300)

  state = await readState(page)
  expect(state.mode).toBe('result')
  expect(state.result.success).toBeTruthy()

  expect(consoleErrors).toEqual([])
})
