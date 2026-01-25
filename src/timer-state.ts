/**
 * Global timer state management for the Nosaki timer.
 * According to wiki: "複数の艦隊でそれぞれ野埼を運用する場合でもタイマーは共通"
 * (Even when operating Nosaki in multiple fleets, the timer is shared).
 * Akashi timers are per-fleet and are managed locally within each FleetList component.
 */

type TimerStateListener = () => void

class TimerStateManager {
  private lastNosakiRefresh: number = 0
  private listeners: Set<TimerStateListener> = new Set()

  getLastNosakiRefresh(): number {
    return this.lastNosakiRefresh
  }

  setLastNosakiRefresh(timestamp: number): void {
    this.lastNosakiRefresh = timestamp
    this.notifyListeners()
  }

  resetNosakiTimer(): void {
    this.lastNosakiRefresh = Date.now()
    this.notifyListeners()
  }

  clearNosakiTimer(): void {
    this.lastNosakiRefresh = 0
    this.notifyListeners()
  }

  subscribe(listener: TimerStateListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener())
  }
}

export const timerState = new TimerStateManager()
