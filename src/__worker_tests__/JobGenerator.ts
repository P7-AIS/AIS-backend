import { AISJobData, AisMessage, AISWorkerAlgorithm, Trajectory } from '../../AIS-models/models'
import * as wks from 'wkx'

export default class JobGenerator {
  public static getRandomJobData(numJobs: number, pathLength: number, algorithm: AISWorkerAlgorithm): AISJobData[] {
    const jobData: AISJobData[] = []

    for (let i = 0; i < numJobs; i++) {
      jobData.push(this.generateJobData(pathLength, algorithm))
    }

    return jobData
  }

  private static generateJobData(pathLength: number, algorithm: AISWorkerAlgorithm): AISJobData {
    const mmsi = Math.random() * 1000000
    const aisMessages = this.generateMessages(mmsi, pathLength)
    const trajectory = this.generateTrajectory(mmsi, pathLength)

    const data: AISJobData = {
      mmsi,
      aisMessages,
      trajectory,
      algorithm,
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
