import { AISJobData, AISWorkerAlgorithm, AisMessage, JobAisData, Trajectory } from '../../AIS-models/models'
import * as wkx from 'wkx'
import * as fs from 'fs'
import { PrismaClient } from '@prisma/client'
import PrismaDatabaseHandler from '../implementations/PrismaDatabaseHandler'

export default class JobGenerator {
  public static getIdenticalJobData(
    numJobs: number,
    algorithm: AISWorkerAlgorithm,
    mmsi: number,
    timestamp: number
  ): AISJobData[] {
    const jobData: AISJobData[] = []

    for (let i = 0; i < numJobs; i++) {
      jobData.push({
        mmsi,
        timestamp,
        algorithm,
      })
    }

    return jobData
  }

  public static exportAisDataForTesting(path: string, pathLength: number) {
    const data = this.generateJobDataForTesting(pathLength)
    fs.writeFileSync(path, JSON.stringify(data))
  }

  public async uploadVesselDataForTesting(mmsi: number, length: number) {
    const prisma = new PrismaClient()
    const databaseHandler = new PrismaDatabaseHandler(prisma)

    const messages = JobGenerator.generateMessages(mmsi, length)
    const trajectory = JobGenerator.generateTrajectory(mmsi, length)

    // await databaseHandler.insertVessel({ mmsi })
    await databaseHandler.insertMessages(messages)
    // await databaseHandler.insertTrajectory(trajectory)
  }

  private static generateJobDataForTesting(pathLength: number): JobAisData {
    const mmsi = Math.random() * 1000000
    const messages = this.generateMessages(mmsi, pathLength)
    const trajectory = this.generateTrajectory(mmsi, pathLength)

    const data: JobAisData = {
      mmsi,
      messages,
      trajectory,
      algorithm: AISWorkerAlgorithm.PROFILING_JSON,
    }

    return data
  }

  private static generateMessages(mmsi: number, pathLength: number): AisMessage[] {
    const messages: AisMessage[] = []

    for (let i = 0; i < pathLength; i++) {
      const message: AisMessage = {
        id: mmsi,
        mmsi: mmsi,
        timestamp: new Date(i),
        cog: Math.random() * 360,
        sog: Math.random() * 10,
      }
      messages.push(message)
    }

    return messages
  }

  private static generateTrajectory(mmsi: number, pathLength: number): Trajectory {
    const points: wkx.Point[] = []

    for (let i = 0; i < pathLength; i++) {
      const point = wkx.Point.M(-90 + Math.random() * 180, -180 + Math.random() * 360, i)
      points.push(point)
    }

    const path = new wkx.LineString(points)
    const trajectory: Trajectory = {
      mmsi,
      binPath: path.toWkb(),
    }

    return trajectory
  }
}
