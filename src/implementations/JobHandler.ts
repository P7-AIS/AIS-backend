import IJobHandler from '../interfaces/IJobHandler'
import ILogicHandler from '../interfaces/ILogicHandler'
import IMonitorable from '../interfaces/IMonitorable'

export default class JobHandler implements IJobHandler, IMonitorable {
  constructor(private readonly logicHandler: ILogicHandler) {}

  example(): void {
    throw new Error('Method not implemented.')
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
