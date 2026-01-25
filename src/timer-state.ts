/**
 * Global timer state management for both Nosaki and repair ship timers.
 * According to wiki:
 * - Nosaki: "複数の艦隊でそれぞれ野埼を運用する場合でもタイマーは共通" (timer is shared across fleets)
 * - Repair ships: "修理時間のタイマーは共通" (repair timer is shared/common across fleets)
 */

type TimerStateListener = () => void

class TimerStateManager {
  private lastNosakiRefresh: number = 0
  private lastRepairRefresh: number = 0 // Global repair timer (Akashi/Asahi Kai)
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

  // Global repair timer methods (Akashi/Asahi Kai)
  getLastRepairRefresh(): number {
    return this.lastRepairRefresh
  }

  setLastRepairRefresh(timestamp: number): void {
    this.lastRepairRefresh = timestamp
    this.notifyListeners()
  }

  resetRepairTimer(): void {
    this.lastRepairRefresh = Date.now()
    this.notifyListeners()
  }

  clearRepairTimer(): void {
    this.lastRepairRefresh = 0
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
