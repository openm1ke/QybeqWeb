import type { ReactNode } from 'react'
import type { AudioSettings } from '../audio/audioService'
import { Icon } from '../components/Icon'
import type { AppCopy, Language } from '../i18n/translations'
import { ScreenFrame } from './CustomizeScreen'
import '../game.css'

/** Settings in the mobile layout: titled plates of rows (`SettingsScreen`). */
/** Analytics and the privacy policy: the open web build only. */
const webExtras = import.meta.env.VITE_PLATFORM !== 'yandex'

export function SettingsScreen({ settings, text, language, analyticsEnabled, appearanceDetail, onChange, onLanguage, onAnalyticsChange, onCustomize, onBack }: {
  settings: AudioSettings
  text: AppCopy
  language: Language
  analyticsEnabled: boolean
  appearanceDetail: string
  onChange: (settings: AudioSettings) => void
  onLanguage: (language: Language) => void
  onAnalyticsChange: (enabled: boolean) => void
  onCustomize: () => void
  onBack: () => void
}) {
  return (
    <ScreenFrame title={text.settings} backLabel={text.back} onBack={onBack}>
      <div className="settings-body">
        <Section title={text.appearance}>
          <button type="button" className="settings-row link" onClick={onCustomize}>
            <RowText title={text.theme} detail={appearanceDetail} />
            <Icon name="chevronRightRounded" size={24} color="#7A808C" />
          </button>
        </Section>
        <Section title={text.audio}>
          <Toggle title={text.music} detail={text.musicDescription} checked={settings.musicEnabled} onChange={(value) => onChange({ ...settings, musicEnabled: value })} />
          <label className="settings-row volume">
            <RowText title={text.musicVolume} detail={`${Math.round(settings.musicVolume * 100)}%`} />
            <input
              aria-label={text.musicVolume}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.musicVolume}
              disabled={!settings.musicEnabled}
              onChange={(event) => onChange({ ...settings, musicVolume: Number(event.target.value) })}
            />
          </label>
          <Toggle title={text.soundEffects} detail={text.soundEffectsDescription} checked={settings.effectsEnabled} onChange={(value) => onChange({ ...settings, effectsEnabled: value })} />
        </Section>
        <Section title={text.language}>
          <div className="settings-row">
            <RowText title={text.language} detail={text.languageDescription} />
            <div className="language-segments" role="group" aria-label={text.language}>
              <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguage('en')}>{text.english}</button>
              <button type="button" aria-pressed={language === 'ru'} onClick={() => onLanguage('ru')}>{text.russian}</button>
            </div>
          </div>
        </Section>
        {webExtras && (
          <Section title={text.privacy}>
            <Toggle title={text.anonymousAnalytics} detail={text.anonymousAnalyticsDescription} checked={analyticsEnabled} onChange={onAnalyticsChange} />
            <a className="settings-row link" href="./privacy.html">
              <RowText title={text.privacyPolicy} />
              <Icon name="chevronRightRounded" size={24} color="#7A808C" />
            </a>
          </Section>
        )}
      </div>
    </ScreenFrame>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h2 className="section-label">{title}</h2>
      <div className="settings-plate">{children}</div>
    </section>
  )
}

function RowText({ title, detail }: { title: string; detail?: string }) {
  return (
    <span className="row-text">
      <span className="row-title">{title}</span>
      {detail && <span className="row-detail">{detail}</span>}
    </span>
  )
}

function Toggle({ title, detail, checked, onChange }: { title: string; detail?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="settings-row">
      <RowText title={title} detail={detail} />
      <input className="q-switch" type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}
