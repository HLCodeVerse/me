'use client'

import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Keyboard } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { App } from '@capacitor/app'

export async function initNativeHardware() {
  if (!Capacitor.isNativePlatform()) return

  try {
    // 1. Status Bar Setup: AMOLED Black with Light Icons
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0A0B0D' })

    // 2. Hide Native Splash Screen smoothly
    await SplashScreen.hide({ fadeOutDuration: 300 })

    // 3. Keyboard Setup
    await Keyboard.setAccessoryBarVisible({ isVisible: false })

    // 4. App State Change Listener
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        StatusBar.setBackgroundColor({ color: '#0A0B0D' })
      }
    })
  } catch (err) {
    console.warn('Native hardware initialization warning:', err)
  }
}

export async function triggerHapticFeedback(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) {
  if (!Capacitor.isNativePlatform()) return

  try {
    if (type === 'light') {
      await Haptics.impact({ style: ImpactStyle.Light })
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } else if (type === 'heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } else if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success })
    } else if (type === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning })
    } else if (type === 'error') {
      await Haptics.notification({ type: NotificationType.Error })
    }
  } catch {
    // Ignore haptic errors on unsupported hardware
  }
}
