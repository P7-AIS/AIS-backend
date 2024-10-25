import { Point, MonitoredVessel, AISJobData, AISJobResult } from '../../AIS-models/models'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import IJobHandler from '../interfaces/IJobHandler'
import ILogicHandler from '../interfaces/ILogicHandler'
import IMonitorable from '../interfaces/IMonitorable'
import { Queue, QueueEvents } from 'bullmq'

export default class JobHandler implements IJobHandler, IMonitorable {
  constructor(
    private readonly logicHandler: ILogicHandler,
    private readonly databaseHandler: IDatabaseHandler,
    private readonly jobQueue: Queue<AISJobData, AISJobResult>,
    private readonly queueEvents: QueueEvents
  ) {
    this.queueEvents.on('completed', async (event) => {
      console.log(`Job ${event.jobId} completed successfully`)
    })

    this.queueEvents.on('failed', async (event) => {
      console.error(`Job ${event.jobId} failed:`, event.failedReason)
    })
  }

  public async getMonitoredVessels(selectionArea: Point[], time: Date): Promise<MonitoredVessel[]> {
    try {
      const jobData = await this.getJobData(selectionArea, time)
      if (jobData.length === 0) return []

      const monitoredVessels = await this.runJobs(jobData, time)

      return monitoredVessels
    } catch (error) {
      console.error('Error in getMonitoredVessels:', error)
      return []
    }
  }

  private async getJobData(selectionArea: Point[], time: Date): Promise<AISJobData[]> {
    const monitoredVesselIds = await this.databaseHandler.getVesselsInArea(selectionArea, time)
    if (!monitoredVesselIds) return []

    const endtime = time
    const starttime = new Date(endtime.getTime() - 60 * 60 * 1000)

    const [trajectories, aisMessages] = await Promise.all([
      this.databaseHandler.getVesselTrajectories(monitoredVesselIds, starttime, endtime),
      Promise.all(
        monitoredVesselIds.map(async (mmsi) => ({
          mmsi,
          messages: (await this.databaseHandler.getVesselMessages([mmsi], starttime, endtime)) || [],
        }))
      ),
    ])

    return (
      trajectories?.map((trajectory) => ({
        mmsi: trajectory.mmsi,
        trajectory,
        aisMessages: aisMessages.find((ais) => ais.mmsi === trajectory.mmsi)?.messages || [],
      })) || []
    )
  }

  private async runJobs(jobData: AISJobData[], time: Date): Promise<MonitoredVessel[]> {
    const jobs = await this.jobQueue.addBulk(
      jobData.map((data) => ({
        name: `${data.mmsi}-${time.toISOString()}`,
        data,
      }))
    )

    const results: AISJobResult[] = await Promise.all(jobs.map((job) => job.waitUntilFinished(this.queueEvents)))

    return results
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
