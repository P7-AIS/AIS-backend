import { mockDeep } from 'jest-mock-extended'
import LogicHandler from '../implementations/LogicHandler'
import JobHandler from '../implementations/JobHandler'
import DatabaseHandler from '../implementations/PrismaDatabaseHandler'
import { Queue, QueueEvents } from 'bullmq'
import { AISJobData, AISJobResult, Point } from '../../AIS-models/models'

const logicHandlerMock = mockDeep<LogicHandler>()
const databaseHandlerMock = mockDeep<DatabaseHandler>()
const jobQueueMock = mockDeep<Queue<AISJobData, AISJobResult>>()
const queueEventsMock = mockDeep<QueueEvents>()

jest.mock('../implementations/PrismaDatabaseHandler', () => ({
  DatabaseHandler: jest.fn(() => databaseHandlerMock),
}))
jest.mock('bullmq', () => ({
  Queue: jest.fn(() => jobQueueMock),
  QueueEvents: jest.fn(() => queueEventsMock),
}))
jest.mock('../implementations/LogicHandler', () => ({
  LogicHandler: jest.fn(() => logicHandlerMock),
}))

let jobHandler: JobHandler
beforeEach(() => {
  jobHandler = new JobHandler(logicHandlerMock, databaseHandlerMock, jobQueueMock, queueEventsMock)
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('JobHandler - getMonitoredVessels', () => {
  it('should return empty list if getJobData throws error', async () => {
    const proto = Object.getPrototypeOf(jobHandler)
    //mock private getJobData method
    const spy = jest.spyOn(proto, 'getJobData').mockImplementation(() => {
      throw new Error()
    })

    const area: Point[] = []
    const time = new Date()
    const res = await proto.getMonitoredVessels(area, time)
    expect(res).toEqual([])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should return empty list if runJobs throws error', async () => {
    const proto = Object.getPrototypeOf(jobHandler)
    //mock private runJobs and getJobData method
    const spy1 = jest.spyOn(proto, 'getJobData').mockImplementation(() => {
      return [
        {
          mmsi: 123,
          aisMessages: [],
          trajectory: {
            mmsi: 123,
            binPath: Buffer.from('whatever', 'utf-8'),
          },
          algorithm: 'simple',
        },
      ]
    })

    const spy2 = jest.spyOn(proto, 'runJobs').mockImplementation(() => {
      throw new Error()
    })

    const area: Point[] = []
    const time = new Date()
    const res = await proto.getMonitoredVessels(area, time)
    expect(res).toEqual([])
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy2).toHaveBeenCalledTimes(1)
  })

  it('should return monitored vessels if getJobData and runJobs succeed', async () => {
    const proto = Object.getPrototypeOf(jobHandler)
    //mock private runJobs and getJobData method
    const spy1 = jest.spyOn(proto, 'getJobData').mockImplementationOnce(() => {
      return [
        {
          mmsi: 123,
          aisMessages: [],
          trajectory: {
            mmsi: 123,
            binPath: Buffer.from('whatever', 'utf-8'),
          },
          algorithm: 'simple',
        },
      ]
    })

    const runJobRes = [
      {
        mmsi: 123,
        trustworthiness: 0.5,
        reason: 'because',
        algorithm: 'simple',
      },
    ]
    const spy2 = jest.spyOn(proto, 'runJobs').mockImplementation(() => {
      return runJobRes
    })

    const area: Point[] = []
    const time = new Date()
    const res = await proto.getMonitoredVessels(area, time)
    expect(res).toEqual(runJobRes)
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy2).toHaveBeenCalledTimes(1)
  })
})

// describe('JobHandler - getJobData', () => {
//   it('should return empty list if getVesselsInArea returns no ids', async () => {
//     const points: Point[] = []
//     const res = await (jobHandler as any).getJobData(points, new Date())
//     expect(res).toEqual([])
//   })
// })
