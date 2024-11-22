import { AISJobData, AISWorkerAlgorithm } from '../../AIS-models/models'

export default class JobGenerator {
  public static getRandomJobData(
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
}
