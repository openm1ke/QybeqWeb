import { afterEach, describe, expect, it, vi } from 'vitest'
import { languageFor } from '../i18n/translations'
import { createYandexPlatform } from '../platform/yandex'
import { setStorageBackend, storage } from '../platform/storage'

type Callbacks = { onOpen?: () => void; onRewarded?: () => void; onClose?: (shown: boolean) => void; onError?: (error: unknown) => void }

function fakeSdk() {
  const calls: string[] = []
  const listeners: Record<string, (() => void)[]> = {}
  let ad: Callbacks = {}
  const sdk = {
    environment: { i18n: { lang: 'be' } },
    features: {
      LoadingAPI: { ready: () => calls.push('ready') },
      GameplayAPI: { start: () => calls.push('start'), stop: () => calls.push('stop') },
    },
    adv: { showRewardedVideo: (options: { callbacks: Callbacks }) => { ad = options.callbacks } },
    on: (event: string, listener: () => void) => { (listeners[event] ??= []).push(listener) },
    getStorage: () => Promise.resolve(new Map<string, string>() as unknown as Storage),
  }
  window.YaGames = { init: () => Promise.resolve(sdk) }
  return { calls, emit: (event: string) => listeners[event]?.forEach((listener) => listener()), ad: () => ad }
}

afterEach(() => {
  delete window.YaGames
  setStorageBackend(null)
})

describe('Yandex Games platform', () => {
  it('reports the SDK language and ready once', async () => {
    const sdk = fakeSdk()
    const platform = createYandexPlatform()
    await platform.init()
    expect(platform.detectedLanguage()).toBe('be')
    platform.ready()
    platform.ready()
    expect(sdk.calls).toEqual(['ready'])
  })

  it('marks gameplay only while it is really played', async () => {
    const sdk = fakeSdk()
    const platform = createYandexPlatform()
    await platform.init()
    platform.setGameplayActive(true)
    platform.setGameplayActive(true)
    sdk.emit('game_api_pause')
    expect(platform.paused).toBe(true)
    sdk.emit('game_api_resume')
    platform.setGameplayActive(false)
    expect(sdk.calls).toEqual(['start', 'stop', 'start', 'stop'])
  })

  it('pays a rewarded video exactly once and pauses the game meanwhile', async () => {
    const sdk = fakeSdk()
    const platform = createYandexPlatform()
    await platform.init()
    const onRewarded = vi.fn()
    const pauses: boolean[] = []
    platform.onPauseChange((paused) => pauses.push(paused))
    const result = platform.showRewardedVideo(onRewarded)
    expect(platform.paused).toBe(true)
    // A second video is refused while one is on screen.
    await expect(platform.showRewardedVideo(vi.fn())).resolves.toBe('unavailable')
    sdk.ad().onOpen?.()
    sdk.ad().onRewarded?.()
    sdk.ad().onRewarded?.()
    sdk.ad().onClose?.(true)
    await expect(result).resolves.toBe('rewarded')
    expect(onRewarded).toHaveBeenCalledTimes(1)
    expect(pauses).toEqual([true, false])
  })

  it('tells a video closed early from one that never showed', async () => {
    const sdk = fakeSdk()
    const platform = createYandexPlatform()
    await platform.init()
    const early = platform.showRewardedVideo(vi.fn())
    sdk.ad().onOpen?.()
    sdk.ad().onClose?.(true)
    await expect(early).resolves.toBe('dismissed')
    const none = platform.showRewardedVideo(vi.fn())
    sdk.ad().onClose?.(false)
    await expect(none).resolves.toBe('unavailable')
    const failed = platform.showRewardedVideo(vi.fn())
    sdk.ad().onError?.(new Error('no fill'))
    await expect(failed).resolves.toBe('failed')
    expect(platform.paused).toBe(false)
  })

  it('plays without the SDK (opened outside Yandex Games)', async () => {
    const platform = createYandexPlatform()
    await platform.init()
    expect(platform.rewardedAds).toBe(false)
    await expect(platform.showRewardedVideo(vi.fn())).resolves.toBe('unavailable')
  })

  it('keeps progress in the SDK storage when it has one', async () => {
    const backing = new Map<string, string>()
    setStorageBackend({ getItem: (key) => backing.get(key) ?? null, setItem: (key, value) => void backing.set(key, value), removeItem: (key) => void backing.delete(key) })
    storage.setItem('qybeq.test', '1')
    expect(backing.get('qybeq.test')).toBe('1')
    expect(localStorage.getItem('qybeq.test')).toBeNull()
  })
})

describe('language fallback', () => {
  it('maps SDK languages the way Yandex Games does', () => {
    expect(languageFor('ru')).toBe('ru')
    expect(languageFor('be')).toBe('ru')
    expect(languageFor('kk')).toBe('ru')
    expect(languageFor('uk')).toBe('ru')
    expect(languageFor('en')).toBe('en')
    expect(languageFor('tr')).toBe('en')
    expect(languageFor('ru-RU')).toBe('ru')
    expect(languageFor(null)).toBe('en')
  })
})
