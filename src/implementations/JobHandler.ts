import { Point, MonitoredVessel, AISJobData, AISJobResult } from '../../AIS-models/models'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import IJobHandler from '../interfaces/IJobHandler'
import ILogicHandler from '../interfaces/ILogicHandler'
import IMonitorable from '../interfaces/IMonitorable'
import { Queue, QueueEvents } from 'bullmq'

export default class JobHandler implements IJobHandler, IMonitorable {
  private readonly queueEvents = new QueueEvents('foo')

  constructor(
    private readonly logicHandler: ILogicHandler,
    private readonly databaseHandler: IDatabaseHandler,
    private readonly jobQueue: Queue<AISJobData, AISJobResult>
  ) {}

  async getMonitoredVessels(selectionArea: Point[], time: Date): Promise<MonitoredVessel[]> {
    const monitoredVesselIds = await this.databaseHandler.getVesselsInArea(selectionArea, time)

    if (!monitoredVesselIds) {
      return []
    }

    const endtime = time
    const starttime = new Date(endtime.getTime() - 60 * 60 * 1000)

    const trajectories = await this.databaseHandler.getVesselTrajectories(monitoredVesselIds, starttime, endtime)

    if (!trajectories) {
      return []
    }

    const aisMessages = await this.databaseHandler.getVesselMessages(monitoredVesselIds, starttime, endtime)

    if (!aisMessages) {
      return []
    }

    // const job = await this.jobQueue.add('test', {
    //   trajectories,
    //   aisMessages,
    // })

    // const result: AISJobResult = await job.waitUntilFinished(this.queueEvents)

    const monitoredVessels: MonitoredVessel[] = []

    return monitoredVessels
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
