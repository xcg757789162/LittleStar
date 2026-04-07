/**
 * 离线数据同步管理器
 */

export interface SyncRecord {
  type: string
  data: unknown
  timestamp?: Date
}

export class SyncManager {
  private pending: SyncRecord[] = []

  addPendingRecord(record: SyncRecord): void {
    this.pending.push({
      ...record,
      timestamp: record.timestamp ?? new Date(),
    })
  }

  getPendingCount(): number {
    return this.pending.length
  }

  getPendingRecords(): SyncRecord[] {
    return [...this.pending]
  }

  clearPending(): void {
    this.pending = []
  }

  async sync(): Promise<number> {
    const count = this.pending.length
    // TODO: 实际同步到服务端
    this.pending = []
    return count
  }
}
