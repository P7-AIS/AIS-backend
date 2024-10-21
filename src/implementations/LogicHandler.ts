import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import ILogicHandler from '../interfaces/ILogicHandler'
import IMonitorable from '../interfaces/IMonitorable'

export default class LogicHandler implements ILogicHandler, IMonitorable {
  constructor(private readonly databaseHandler: IDatabaseHandler) {}

  example(): void {
    throw new Error('Method not implemented.')
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
