import { AISJobData, AISJobResult, AISWorkerAlgorithm } from '../../AIS-models/models'
import JobGenerator from './JobGenerator'
import dotenv from 'dotenv'
import { Queue, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

dotenv.config()

const { REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME } = process.env

if (!REDIS_IP || !REDIS_PORT || !REDIS_QUEUE_NAME) {
  throw new Error('Missing environment variables')
}

const redis = new Redis(Number(REDIS_PORT), REDIS_IP, {
  maxRetriesPerRequest: null,
})
redis.flushall()

const jobQueue = new Queue<AISJobData, AISJobResult>(REDIS_QUEUE_NAME, { connection: redis })
const queueEvents = new QueueEvents(REDIS_QUEUE_NAME, { connection: redis })

const jobData = JobGenerator.getRandomJobData(10000, 10, AISWorkerAlgorithm.RANDOM)

const jobSubmissionTimes: Record<string, number> = {}
const jobIdMap: Record<string, string> = {}

let completedJobs = 0
const throughputInterval = 10000

setInterval(() => {
  console.log(`[METRIC] Throughput: ${completedJobs / (throughputInterval / 1000)} jobs/second`)
  completedJobs = 0
}, throughputInterval)

async function runJobs(jobData: AISJobData[]) {
  const jobs = await jobQueue.addBulk(
    jobData.map((job) => {
      const jobName = job.mmsi.toString()
      jobSubmissionTimes[jobName] = Date.now()
      return {
        name: jobName,
        data: job,
        opts: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      }
    })
  )

  jobs.forEach((job) => {
    jobIdMap[job.id!] = job.name
  })

  console.log(`[INFO] Submitted ${jobs.length} jobs`)
}

queueEvents.on('completed', ({ jobId }) => {
  const customJobId = jobIdMap[jobId]
  const startTime = jobSubmissionTimes[customJobId]

  if (startTime) {
    const latency = Date.now() - startTime
    console.log(`[METRIC] Job ${jobId} completed with latency: ${latency} ms`)
    completedJobs++
    delete jobSubmissionTimes[jobId]
  }
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`[ERROR] Job ${jobId} failed with reason: ${failedReason}`)
})

runJobs(jobData).catch(console.error)
