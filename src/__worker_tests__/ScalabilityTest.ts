import k8sHandler from '../../k8s/K8sHandler'
import JobGenerator from './JobGenerator'
import { AISWorkerAlgorithm } from '../../AIS-models/models'
import { AISJobData, AISJobResult } from '../../AIS-models/models'
import { Queue, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import TestReport, { FixedTestConfig, TestReportEntry } from './reports/TestReport'

export default class ScalabilityTest {
  private readonly redis: Redis
  private readonly jobQueue: Queue
  private readonly queueEvents: QueueEvents

  constructor(REDIS_IP: string, REDIS_PORT: string, REDIS_QUEUE_NAME: string) {
    this.redis = new Redis(Number(REDIS_PORT), REDIS_IP, {
      maxRetriesPerRequest: null,
    })
    this.jobQueue = new Queue<AISJobData, AISJobResult>(REDIS_QUEUE_NAME, { connection: this.redis })
    this.queueEvents = new QueueEvents(REDIS_QUEUE_NAME, { connection: this.redis })
    this.jobQueue.setMaxListeners(Infinity)
  }

  async runTest(config: FixedTestConfig) {
    const { minReplicas, maxReplicas, vesselStep, minVessels, maxVessels, mmsi, timestamp, isFetch } = config

    if (maxReplicas > 20) {
      throw new Error('Too many replicas')
    }

    const report = new TestReport(config)

    for (let replicas = maxReplicas; replicas > minReplicas; replicas--) {
      await this.scaleDeploymentAndWait('ais', 'ais-worker', replicas)
      for (let vessels = maxVessels; vessels >= minVessels; vessels -= vesselStep) {
        await this.cleanUp()
        const duration = await this.runFixedTest(replicas, vessels, mmsi, timestamp, isFetch === 1)
        const entry: TestReportEntry = { replicas, vessels, duration }
        report.addEntry(entry)
        report.outputReport('logs')
      }
    }
  }

  private async scaleDeploymentAndWait(namespace: string, deploymentName: string, replicas: number) {
    const FAILSAFE_DURATION = 60_000 //one minute
    const TIME_BETWEEN_TRIES = 1_000
    await k8sHandler.scaleDeployment(namespace, deploymentName, replicas)
    let durationWaited: number = 0
    while (durationWaited < FAILSAFE_DURATION) {
      if ((await k8sHandler.readNumDeploymentReplicas(namespace, deploymentName)) !== replicas) {
        await new Promise((resolve) => setTimeout(resolve, TIME_BETWEEN_TRIES)) //wait one second
        durationWaited += TIME_BETWEEN_TRIES
      } else {
        console.log(`${replicas} replicas ready`)
        return
      }
    }
    throw new Error(`Scaling to ${replicas} replicas did not succeed within ${FAILSAFE_DURATION}ms`)
  }

  private async cleanUp() {
    console.log('Flushing redis')
    await this.redis.flushall()
    console.log('Redis flushed')
  }

  private async runFixedTest(replicas: number, vessels: number, mmsi: number, timestamp: number, isFetch: boolean) {
    const algo = isFetch ? AISWorkerAlgorithm.PROFILING_FETCH : AISWorkerAlgorithm.PROFILING_JSON
    const generatedJobsData = JobGenerator.getIdenticalJobData(vessels, algo, mmsi, timestamp)
    console.log(`Generated ${vessels} jobs for ${replicas} replicas`)
    const startTime = performance.now()
    console.log('Running jobs...')
    await this.runJobs(generatedJobsData)
    console.log('Jobs completed')
    const endTime = performance.now()
    const duration = endTime - startTime
    return duration
  }

  private async runJobs(jobData: AISJobData[]) {
    console.log(`Received ${jobData.length} job(s) to process.`)

    console.time('Bulking time')

    const jobs = await this.jobQueue.addBulk(
      jobData.map((job) => {
        const jobName = job.mmsi.toString()
        return {
          name: jobName,
          data: job,
          opts: {
            removeOnComplete: {
              age: 100,
            },
            removeOnFail: true,
          },
        }
      })
    )
    console.timeEnd('Bulking time')

    const results = await Promise.all(
      jobs.map((job) =>
        job
          .waitUntilFinished(this.queueEvents)
          .then((result) => {
            // console.log(`Job ${job.name} completed.`)
            return result
          })
          .catch((err) => {
            console.error(`Job ${job.name} failed:`, err)
            throw err
          })
      )
    )

    console.log(`All batches processed. Total results: ${results.length}`)
  }
}
