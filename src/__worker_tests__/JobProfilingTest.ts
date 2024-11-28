import k8sHandler from '../../k8s/K8sHandler'
import JobGenerator from './JobGenerator'
import { AISWorkerAlgorithm, AISJobTestResult, AISJobData } from '../../AIS-models/models'
import { Queue, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import TestReport, { FixedTestConfig, JobProfileEntry } from './reports/TestReport'

interface JobProfile {
  startCreatingJobs: number
  endCreatingJobs: number
  startQueueTo: number
  endQueueTo: number
  startDbQuery: number
  endDbQuery: number
  startAlgo: number
  endAlgo: number
  startQueueBack: number
  endQueueBack: number
}

interface JobProfiles {
  [jobId: string]: Partial<JobProfile>
}

export default class JobProfilingTest {
  private readonly redis: Redis
  private readonly jobQueue: Queue
  private readonly queueEvents: QueueEvents
  private readonly jobProfiles: JobProfiles = {}

  constructor(REDIS_IP: string, REDIS_PORT: string, REDIS_QUEUE_NAME: string) {
    this.redis = new Redis(Number(REDIS_PORT), REDIS_IP, {
      maxRetriesPerRequest: null,
    })
    this.jobQueue = new Queue<AISJobData, AISJobTestResult>(REDIS_QUEUE_NAME, { connection: this.redis })
    this.queueEvents = new QueueEvents(REDIS_QUEUE_NAME, { connection: this.redis })
    this.jobQueue.setMaxListeners(Infinity)

    this.queueEvents.on('added', (event) => {
      const now = new Date().getTime()
      this.jobProfiles[event.jobId] = {
        ...this.jobProfiles[event.jobId],
        endCreatingJobs: now,
        startQueueTo: now,
      }
    })
  }

  createJobEntry(profile: Partial<JobProfile>, replicas: number, vessels: number): JobProfileEntry {
    return {
      replicas,
      vessels,
      jobCreation: profile.endCreatingJobs! - profile.startCreatingJobs!,
      queueingForWorker: profile.endQueueTo! - profile.startQueueTo!,
      dbQuerying: profile.endDbQuery! - profile.startDbQuery!,
      algorithm: profile.endAlgo! - profile.startAlgo!,
      queueingForBackend: profile.endQueueBack! - profile.startQueueBack!,
    }
  }

  async runTest(config: FixedTestConfig) {
    const { minReplicas, maxReplicas, vesselStep, minVessels, maxVessels, mmsi, timestamp } = config

    if (maxReplicas > 20) {
      throw new Error('Too many replicas')
    }

    const report = new TestReport(config)

    for (let replicas = maxReplicas; replicas >= minReplicas; replicas--) {
      await this.scaleDeploymentAndWait('ais', 'ais-worker', replicas)
      for (let vessels = maxVessels; vessels >= minVessels; vessels -= vesselStep) {
        await this.cleanUp()
        await this.runFixedTest(replicas, vessels, mmsi, timestamp)

        Object.values(this.jobProfiles).forEach((profile) =>
          report.addEntry(this.createJobEntry(profile, replicas, vessels))
        )
        report.outputReport('logs')
      }
    }
  }

  async scaleDeploymentAndWait(namespace: string, deploymentName: string, replicas: number) {
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

  async cleanUp() {
    console.log('Flushing redis')
    await this.redis.flushall()
    console.log('Redis flushed')
  }

  async runFixedTest(replicas: number, vessels: number, mmsi: number, timestamp: number) {
    const generatedJobsData = JobGenerator.getIdenticalJobData(vessels, AISWorkerAlgorithm.PROFILING, mmsi, timestamp)
    console.log(`Generated ${vessels} jobs for ${replicas} replicas`)
    const startTime = new Date().getTime()
    console.log('Running jobs...')
    await this.runJobs(generatedJobsData)
    console.log('Jobs completed')
    const endTime = new Date().getTime()
    const duration = endTime - startTime
    return duration
  }

  async runJobs(jobData: AISJobData[]) {
    console.log(`Received ${jobData.length} job(s) to process.`)

    console.time('Bulking time')

    const startCreatingJobs = new Date().getTime()

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

    jobs.forEach((job) => {
      this.jobProfiles[job.id!] = {
        ...this.jobProfiles[job.id!],
        startCreatingJobs,
      }
    })

    console.timeEnd('Bulking time')

    const results = await Promise.all(
      jobs.map((job) =>
        job
          .waitUntilFinished(this.queueEvents)
          .then((result: AISJobTestResult) => {
            this.jobProfiles[job.id!].endQueueBack = new Date().getTime()

            this.jobProfiles[job.id!] = {
              ...this.jobProfiles[job.id!],
              startAlgo: result.startAlgo,
              endAlgo: result.endAlgo,
              startDbQuery: result.startDbQuery,
              endDbQuery: result.endDbQuery,
              endQueueTo: result.endQueuedTo,
              startQueueBack: result.startQueuedFrom,
            }

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
