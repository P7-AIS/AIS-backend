import { AISJobData, AISWorkerAlgorithm, AisMessage, JobAisData, Trajectory } from '../../AIS-models/models'
import * as wks from 'wkx'
import * as fs from 'fs'

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

  private static generateJobDataForTesting(pathLength: number): JobAisData {
    const mmsi = Math.random() * 1000000
    const messages = this.generateMessages(mmsi, pathLength)
    const trajectory = this.generateTrajectory(mmsi, pathLength)

    const data: JobAisData = {
      mmsi,
      messages,
      trajectory,
      algorithm: AISWorkerAlgorithm.TESTING,
    }

    return data
  }

  private static generateMessages(mmsi: number, pathLength: number): AisMessage[] {
    const messages: AisMessage[] = []

    for (let i = 0; i < pathLength; i++) {
      const message: AisMessage = {
        id: mmsi,
        mmsi: mmsi,
        timestamp: new Date(),
        cog: Math.random() * 360,
        sog: Math.random() * 10,
      }
      messages.push(message)
    }

    return messages
  }

  private static generateTrajectory(mmsi: number, pathLength: number): Trajectory {
    const points: wks.Point[] = []

    for (let i = 0; i < pathLength; i++) {
      const point = new wks.Point(-90 + Math.random() * 180, -180 + Math.random() * 360)
      points.push(point)
    }

    const path = new wks.LineString(points)
    const trajectory: Trajectory = {
      mmsi,
      binPath: path.toWkb(),
    }

    return trajectory
  }
}
