import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVKPlatform } from '../platform/vk'
import { setStorageBackend, storage } from '../platform/storage'

const mock = vi.hoisted(() => ({ embedded: true, send: vi.fn(), subscribe: vi.fn() }))

vi.mock('@vkontakte/vk-bridge', () => ({
  default: {
    isEmbedded: () => mock.embedded,
    send: mock.send,
    subscribe: mock.subscribe,
  },
}))

beforeEach(() => {
  mock.embedded = true
  mock.send.mockImplementation(async (method: string) => {
    if (method === 'VKWebAppInit') return { result: true }
    if (method === 'VKWebAppGetLaunchParams') return { vk_app_id: 123456, vk_user_id: 1, vk_language: 'ru', vk_platform: 'mobile_web' }
    if (method === 'VKWebAppGetConfig') return { insets: { top: 20, right: 0, bottom: 10, left: 0 }, adaptivity: 'force_mobile' }
    if (method === 'VKWebAppStorageGet') return { keys: [] }
    if (method === 'VKWebAppStorageSet') return { result: true }
    if (method === 'VKWebAppCheckNativeAds') return { result: true }
    if (method === 'VKWebAppShowNativeAds') return { result: true }
    throw new Error(`Unexpected VK method: ${method}`)
  })
})
afterEach(() => {
  mock.send.mockReset()
  mock.subscribe.mockReset()
  setStorageBackend(null)
})

describe('VK Games platform', () => {
  it('initializes VK, applies config and hydrates storage before the game mounts', async () => {
    const platform = createVKPlatform()
    await platform.init()

    expect(platform.detectedLanguage()).toBe('ru')
    expect(platform.rewardedAds).toBe(true)
    expect(document.documentElement.dataset.platform).toBe('vk')
    expect(document.documentElement.style.getPropertyValue('--vk-inset-top')).toBe('20px')
    expect(mock.send.mock.calls.map(([method]) => method)).toEqual([
      'VKWebAppInit', 'VKWebAppGetLaunchParams', 'VKWebAppGetConfig', 'VKWebAppStorageGet',
    ])
  })

  it('pauses around one rewarded ad and grants only after VK confirms it', async () => {
    const platform = createVKPlatform()
    await platform.init()
    const onRewarded = vi.fn()
    const pauses: boolean[] = []
    platform.onPauseChange((paused) => pauses.push(paused))

    const result = platform.showRewardedVideo(onRewarded)
    expect(platform.paused).toBe(true)
    await expect(platform.showRewardedVideo(vi.fn())).resolves.toBe('unavailable')
    await expect(result).resolves.toBe('rewarded')

    expect(onRewarded).toHaveBeenCalledTimes(1)
    expect(pauses).toEqual([true, false])
    expect(mock.send).toHaveBeenCalledWith('VKWebAppCheckNativeAds', { ad_format: 'reward', use_waterfall: true })
    expect(mock.send).toHaveBeenCalledWith('VKWebAppShowNativeAds', { ad_format: 'reward', use_waterfall: true })
  })

  it('returns unavailable when VK has no rewarded ad', async () => {
    mock.send.mockImplementation(async (method: string) => {
      if (method === 'VKWebAppInit') return { result: true }
      if (method === 'VKWebAppGetLaunchParams') return { vk_app_id: 123456, vk_user_id: 1, vk_language: 'ru', vk_platform: 'desktop_web' }
      if (method === 'VKWebAppGetConfig') return { insets: { top: 0, right: 0, bottom: 0, left: 0 } }
      if (method === 'VKWebAppStorageGet') return { keys: [] }
      if (method === 'VKWebAppCheckNativeAds') return { result: false }
      throw new Error(`Unexpected VK method: ${method}`)
    })
    const platform = createVKPlatform()
    await platform.init()
    await expect(platform.showRewardedVideo(vi.fn())).resolves.toBe('unavailable')
    expect(platform.paused).toBe(false)
  })

  it('keeps the game playable outside VK without making SDK calls', async () => {
    mock.embedded = false
    const platform = createVKPlatform()
    await expect(platform.init()).rejects.toThrow('inside VK')
    expect(mock.send).not.toHaveBeenCalled()
    await expect(platform.showRewardedVideo(vi.fn())).resolves.toBe('unavailable')
  })

  it('uses VK Storage as the active save backend', async () => {
    const values = new Map<string, string>()
    mock.send.mockImplementation(async (method: string, data?: { keys?: string[]; key?: string; value?: string }) => {
      if (method === 'VKWebAppInit') return { result: true }
      if (method === 'VKWebAppGetLaunchParams') return { vk_app_id: 123456, vk_user_id: 1, vk_language: 'ru', vk_platform: 'desktop_web' }
      if (method === 'VKWebAppGetConfig') return { insets: { top: 0, right: 0, bottom: 0, left: 0 } }
      if (method === 'VKWebAppStorageGet') return { keys: (data?.keys ?? []).map((key) => ({ key, value: values.get(key) ?? '' })) }
      if (method === 'VKWebAppStorageSet') { values.set(data!.key!, data!.value!); return { result: true } }
      throw new Error(`Unexpected VK method: ${method}`)
    })
    const platform = createVKPlatform()
    await platform.init()
    storage.setItem('qybeq.progress.v1', 'cloud-save')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(values.get('qybeq.progress.v1')).toBe('cloud-save')
  })
})
