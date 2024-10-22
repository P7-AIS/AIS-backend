import { Point, MonitoredVessel, AISJobData, AISJobResult } from '../../AIS-models/models'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import IJobHandler from '../interfaces/IJobHandler'
import ILogicHandler from '../interfaces/ILogicHandler'
import IMonitorable from '../interfaces/IMonitorable'
import { Queue } from 'bullmq'

export default class JobHandler implements IJobHandler, IMonitorable {
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

    const vesselPaths = await this.databaseHandler.getBinVesselPaths(monitoredVesselIds, time, time)

    const monitoredVessels: MonitoredVessel[] = monitoredVesselIds.map((mmsi) => ({
      mmsi,
      trustworthiness: 0,
    }))

    return monitoredVessels
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
