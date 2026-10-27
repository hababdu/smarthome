/**
 * Tactile haptic feedback helper using navigator.vibrate()
 * Provides subtle, Apple-like tactile impulses on user interactions.
 */
export function triggerHaptic(
  type: 'toggle' | 'quickAction' | 'success' | 'warning' | 'light' | 'medium' = 'light'
) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'toggle':
          // Subtle 12ms impulse when toggling a device switch
          navigator.vibrate(12);
          break;
        case 'quickAction':
          // Distinct crisp double pulse for quick action scene execution
          navigator.vibrate([15, 35, 18]);
          break;
        case 'success':
          navigator.vibrate([10, 25, 15]);
          break;
        case 'warning':
          navigator.vibrate([35, 40, 35]);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'light':
        default:
          navigator.vibrate(8);
          break;
      }
    } catch (_) {
      // Silently catch in environments where vibration is restricted or unsupported
    }
  }
}
