import { createWebPlatform } from './web'
import { createYandexPlatform } from './yandex'

export type { Platform, RewardedResult } from './platform'

/**
 * The platform this build targets, fixed at build time by
 * `VITE_PLATFORM` (`npm run build` for the web, `npm run build:yandex` for
 * Yandex Games); the other one is left out of the bundle.
 *
 * Web-only UI (analytics consent, links to the privacy policy) checks
 * `import.meta.env.VITE_PLATFORM !== 'yandex'` in place, so the Yandex
 * bundle does not even contain it: Yandex Games allows no external links
 * (requirements 8.4.2, 3.5) and no third-party scripts.
 */
export const platform = import.meta.env.VITE_PLATFORM === 'yandex' ? createYandexPlatform() : createWebPlatform()
