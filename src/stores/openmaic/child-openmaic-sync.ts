import type { Child, ChildSettings } from '@/types/models'
import { useUserProfileStore } from '@/lib/openmaic/store/user-profile'
import { normalizeChildSettings, getSelfIntroductionFromSettings } from './child-settings-compat'
import { syncSettingsToOpenMAIC } from './settings-sync'

export function syncChildProfileToOpenMAIC(child: Child | null | undefined): void {
  const profileStore = useUserProfileStore.getState()

  if (!child) {
    profileStore.setNickname('')
    profileStore.setBio('')
    return
  }

  if (child.avatar?.startsWith('data:') || child.avatar?.startsWith('/avatars/')) {
    profileStore.setAvatar(child.avatar)
  }

  profileStore.setNickname(child.name || '')
  profileStore.setBio(getSelfIntroductionFromSettings(child.settings))
}

export function getSyncedChildSettings(child: Child | null | undefined): ChildSettings | null {
  return normalizeChildSettings(child?.settings)
}

export function syncChildToOpenMAIC(child: Child | null | undefined): void {
  if (!child) return

  syncChildProfileToOpenMAIC(child)

  const settings = getSyncedChildSettings(child)
  if (settings) {
    syncSettingsToOpenMAIC(settings)
  }
}
