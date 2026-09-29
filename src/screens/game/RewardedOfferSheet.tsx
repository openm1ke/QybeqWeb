import { Icon } from '../../components/Icon'
import { PrimaryAction, SecondaryAction, Sheet } from '../../components/ui'
import type { AppCopy } from '../../i18n/translations'

/** How asking for a video-paid hint ended (mobile `RewardOutcome`). */
export type RewardOutcome = 'granted' | 'dismissed' | 'unavailable' | 'failed' | 'expired'

/**
 * "Watch a short video for one more hint" (mobile `RewardedOfferSheet`).
 * The button says a video will play and what it gives (Yandex Games 4.5.1).
 * It closes itself once the hint is granted; any other outcome stays here
 * as a calm status with Retry / Close.
 */
export function RewardedOfferSheet({ text, busy, outcome, onWatch, onClose }: {
  text: AppCopy
  busy: boolean
  outcome: Exclude<RewardOutcome, 'granted'> | null
  onWatch: () => void
  onClose: () => void
}) {
  const canRetry = outcome !== 'expired'
  const status = outcome == null ? null : {
    dismissed: text.videoDismissed,
    unavailable: text.videoUnavailable,
    failed: text.videoFailed,
    expired: text.videoExpired,
  }[outcome]
  return (
    <Sheet label={text.rewardedHintTitle} onDismiss={busy ? () => {} : onClose}>
      <div className="reward-offer">
        <span className="reward-badge" aria-hidden="true">
          <Icon name="lightbulbOutlineRounded" size={26} />
          <Icon name="playCircleFillRounded" size={15} className="reward-badge-play" />
        </span>
        <h2 className="reward-title">{text.rewardedHintTitle}</h2>
        <p className="reward-body">{text.rewardedHintBody}</p>
        {status && (
          <p className="reward-status" role="status">
            <Icon name="infoOutlineRounded" size={18} />
            <span>{status}</span>
          </p>
        )}
        <div className="reward-actions">
          {canRetry && (
            <PrimaryAction
              label={busy ? text.openingVideo : outcome == null ? text.watchVideo : text.retry}
              icon={busy ? undefined : outcome == null ? 'playArrowRounded' : 'refreshRounded'}
              onPress={busy ? undefined : onWatch}
            />
          )}
          <SecondaryAction label={outcome == null ? text.notNow : text.close} onPress={busy ? undefined : onClose} />
        </div>
      </div>
    </Sheet>
  )
}
