import { useState, type ReactNode } from 'react'
import { BlockedTile, PieceArt } from '../components/GameCanvas'
import { Icon } from '../components/Icon'
import { MiniBoard } from '../components/MiniBoard'
import { PrimaryAction, QuietAction, SecondaryAction, Sheet } from '../components/ui'
import {
  AppearanceContext,
  isItemUnlocked,
  matchesPreset,
  presetAppearance,
  withItem,
  type Appearance,
} from '../cosmetics/appearance'
import { itemsFor, pieceColor, presets, type CosmeticItem, type CosmeticSlot, type ThemePreset } from '../cosmetics/skins'
import { pieceById, sampleLevel } from '../game/pieces'
import { transformCells } from '../game/transforms'
import type { AppCopy } from '../i18n/translations'
import '../game.css'

/**
 * Pieces, dice and board, each chosen on its own or together as a preset
 * (mobile `CustomizeScreen`). Every preview is drawn by the game's own
 * renderers with the skins it shows, so a card looks exactly like the game.
 */
export function CustomizeScreen({ text, appearance, stars, owned, onChange, onPurchase, onBack }: {
  text: AppCopy
  appearance: Appearance
  stars: number
  owned: ReadonlySet<string>
  onChange: (appearance: Appearance, source: string) => void
  onPurchase: (preset: ThemePreset) => boolean
  onBack: () => void
}) {
  const [slot, setSlot] = useState<CosmeticSlot>('pieces')
  const [confirming, setConfirming] = useState<ThemePreset | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const width = window.innerWidth
  const height = window.innerHeight
  const content = Math.min(width, 640) - 40
  const preview = Math.min(width >= 600 ? 300 : 240, content - 24, height * 0.34)
  const classic = presets[0]
  const presetName = (preset: ThemePreset) => text.themeName(preset.id, preset.name)

  const choosePreset = (preset: ThemePreset) => {
    if (preset.price === 0 || owned.has(preset.id)) {
      onChange(presetAppearance(preset), 'preset')
      return
    }
    if (stars < preset.price) {
      setNotice(text.notEnoughStars)
      window.setTimeout(() => setNotice(null), 2600)
      return
    }
    setConfirming(preset)
  }

  return (
    <ScreenFrame title={text.customize} backLabel={text.back} onBack={onBack}>
      <div className="customize-body" style={{ width: content }}>
        <div
          className="live-preview"
          role="img"
          aria-label={text.previewSemantics(
            text.skinName(appearance.pieces.id, appearance.pieces.name),
            text.skinName(appearance.dice.id, appearance.dice.name),
            text.skinName(appearance.board.id, appearance.board.name),
          )}
          style={{ width: preview, height: preview }}
        >
          {/* The preview shows exactly what is selected, independent of where
              this screen sits in the tree. */}
          <AppearanceContext.Provider value={appearance}>
            <div key={`${appearance.pieces.id}/${appearance.dice.id}/${appearance.board.id}`} className="live-preview-fade">
              <MiniBoard extent={preview} level={sampleLevel} placed={sampleLevel.referenceSolution.slice(0, 5)} />
            </div>
          </AppearanceContext.Provider>
        </div>
        <div className="balance-chip">
          <Icon name="starRounded" size={20} color="#5B8CFF" />
          <span>{text.starsAvailable(stars)}</span>
        </div>

        <div className="section-row">
          <h2 className="section-label">{text.presets}</h2>
          <span className="caption">{text.swipeThemes}</span>
        </div>
        <div className="preset-strip">
          {presets.map((preset) => {
            const selected = matchesPreset(appearance, preset)
            const locked = preset.price > 0 && !owned.has(preset.id)
            return (
              <ChoiceCard
                key={preset.id}
                className="preset-card"
                title={presetName(preset)}
                ariaLabel={text.presetSemantics(presetName(preset), selected)}
                selectedLabel={text.selected}
                selected={selected}
                locked={locked}
                lockedLabel={stars >= preset.price ? text.unlockFor(preset.price) : text.progressToUnlock(stars, preset.price)}
                onPress={() => choosePreset(preset)}
                preview={
                  <AppearanceContext.Provider value={presetAppearance(preset)}>
                    <MiniBoard extent={72} level={sampleLevel} placed={sampleLevel.referenceSolution.slice(0, 3)} />
                  </AppearanceContext.Provider>
                }
              />
            )
          })}
        </div>

        <div className="slot-tabs" role="tablist">
          {(['pieces', 'dice', 'board'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={value === slot}
              className={value === slot ? 'selected' : ''}
              onClick={() => setSlot(value)}
            >
              {value === 'pieces' ? text.pieces : value === 'dice' ? text.dice : text.board}
            </button>
          ))}
        </div>

        <div className="skin-grid">
          {itemsFor(slot).map((item) => {
            const selected = appearance[item.slot].id === item.id
            const locked = !isItemUnlocked(item, owned)
            const name = text.skinName(item.id, item.name)
            return (
              <ChoiceCard
                key={item.id}
                title={name}
                ariaLabel={text.skinSemantics(name, text.skinKind(item.slot), selected, locked)}
                selectedLabel={text.selected}
                selected={selected}
                locked={locked}
                lockedLabel={text.locked}
                lockedActionable={false}
                onPress={() => onChange(withItem(appearance, item), item.slot)}
                preview={
                  <AppearanceContext.Provider value={withItem(appearance, item)}>
                    <SkinSample item={item} />
                  </AppearanceContext.Provider>
                }
              />
            )
          })}
        </div>

        <div className="reset-row">
          <QuietAction
            label={text.resetToClassic}
            icon="restartAltRounded"
            onPress={matchesPreset(appearance, classic) ? undefined : () => onChange(presetAppearance(classic), 'reset')}
          />
        </div>
      </div>

      {notice && <div className="q-toast" role="status">{notice}</div>}
      {confirming && (
        <Sheet label={text.unlockThemeTitle(presetName(confirming))} onDismiss={() => setConfirming(null)}>
          <h2 className="sheet-title">{text.unlockThemeTitle(presetName(confirming))}</h2>
          <p className="sheet-body">{text.unlockThemeBody(confirming.price, stars - confirming.price)}</p>
          <div className="sheet-actions">
            <PrimaryAction
              label={text.unlock}
              compact
              onPress={() => {
                const preset = confirming
                setConfirming(null)
                if (onPurchase(preset)) onChange(presetAppearance(preset), 'purchase')
              }}
            />
            <SecondaryAction label={text.cancel} compact onPress={() => setConfirming(null)} />
          </div>
        </Sheet>
      )}
    </ScreenFrame>
  )
}

/** The skin drawn by its real renderer, the other slots as they are now. */
function SkinSample({ item }: { item: CosmeticItem }) {
  if (item.slot === 'dice') {
    return (
      <span className="sample-row">
        {['B2', 'E5'].map((label) => <BlockedTile key={label} cellSize={44} label={label} skin={item} />)}
      </span>
    )
  }
  if (item.slot === 'board') return <MiniBoard extent={72} level={sampleLevel} />
  const sample: [string, number][] = [['elbow4', 0], ['tee', 2], ['zigzag', 1]]
  return (
    <span className="sample-row" style={{ gap: 8 }}>
      {sample.map(([id, turns]) => (
        <PieceArt
          key={id}
          cells={transformCells(pieceById(id).cells, { quarterTurns: turns, mirrored: false })}
          color={pieceColor(item, id)}
          material={item.material}
          cellSize={14}
        />
      ))}
    </span>
  )
}

/**
 * One option (a skin, a preset): a graphite plate that lights up with an
 * accent border, a check and the word "Selected" — never colour alone.
 */
function ChoiceCard({ title, ariaLabel, preview, selected, selectedLabel, locked, lockedLabel, lockedActionable = true, onPress, className }: {
  title: string
  ariaLabel: string
  preview: ReactNode
  selected: boolean
  selectedLabel: string
  locked: boolean
  lockedLabel: string
  lockedActionable?: boolean
  onPress: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={['choice-card', selected ? 'selected' : '', locked ? 'locked' : '', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      aria-pressed={selected}
      disabled={locked && !lockedActionable}
      onClick={onPress}
    >
      <span className="choice-preview">{preview}</span>
      <span className="choice-title">{title}</span>
      <span className="choice-status">
        {selected ? (
          <><Icon name="checkCircleRounded" size={15} color="#5B8CFF" /><span className="accent">{selectedLabel}</span></>
        ) : locked ? (
          <><Icon name="lockRounded" size={15} color="#7A808C" /><span>{lockedLabel}</span></>
        ) : null}
      </span>
    </button>
  )
}

/** Secondary screens: backdrop, a slim bar with Back and a centred title. */
export function ScreenFrame({ title, backLabel, onBack, trailing, children }: {
  title: string
  backLabel: string
  onBack: () => void
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="screen-frame">
      <div className="app-backdrop" aria-hidden="true" />
      <header className="screen-bar">
        <button type="button" className="screen-back" onClick={onBack} aria-label={backLabel}>
          <Icon name="chevronLeftRounded" size={30} />
        </button>
        <h1>{title}</h1>
        <span className="screen-bar-trailing">{trailing}</span>
      </header>
      <div className="screen-scroll">{children}</div>
    </main>
  )
}
