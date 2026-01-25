/**
 * Global timer state management for Akashi and Nosaki timers
 * According to wiki: "複数の艦隊でそれぞれ野埼を運用する場合でもタイマーは共通"
 * (Even when operating Nosaki in multiple fleets, the timer is shared)
 */

type TimerStateListener = () => void

class TimerStateManager {
  private lastAkashiRefresh: number = 0
  private lastNosakiRefresh: number = 0
  private listeners: Set<TimerStateListener> = new Set()

  getLastAkashiRefresh(): number {
    return this.lastAkashiRefresh
  }

  getLastNosakiRefresh(): number {
    return this.lastNosakiRefresh
  }

  setLastAkashiRefresh(timestamp: number): void {
    this.lastAkashiRefresh = timestamp
    this.notifyListeners()
  }

  setLastNosakiRefresh(timestamp: number): void {
    this.lastNosakiRefresh = timestamp
    this.notifyListeners()
  }

  resetAkashiTimer(): void {
    this.lastAkashiRefresh = Date.now()
    this.notifyListeners()
  }

  resetNosakiTimer(): void {
    this.lastNosakiRefresh = Date.now()
    this.notifyListeners()
  }

  clearAkashiTimer(): void {
    this.lastAkashiRefresh = 0
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
