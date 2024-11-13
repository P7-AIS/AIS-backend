import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import ILogicHandler from '../interfaces/ILogicHandler'

export default class LogicHandler implements ILogicHandler {
  constructor(private readonly databaseHandler: IDatabaseHandler) {}

  example(): void {
    throw new Error('Method not implemented.')
  }
}
