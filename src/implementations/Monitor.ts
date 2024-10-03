import IMonitor from '../interfaces/IMonitor'
import IMonitorable from '../interfaces/IMonitorable'

export default class Monitor implements IMonitor {
  private intervalRef: NodeJS.Timeout | null

  constructor(private readonly monitorables: IMonitorable[]) {
    this.monitorables = monitorables
    this.intervalRef = null
  }

  start(): void {
    this.intervalRef = setInterval(() => {
      this.monitorables.forEach((monitorable) => {
        console.log(monitorable.getAccumulatedLogs())
      })
    }, 1000)
  }

  stop(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef)
    }
  }
}
