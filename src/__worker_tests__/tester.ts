import JobProfilingTest from './JobProfilingTest'
import ScalabilityTest from './ScalabilityTest'
import dotenv from 'dotenv'

dotenv.config()

const { SERVER_PORT, SERVER_IP, REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME } = process.env

if (!SERVER_PORT || !SERVER_IP || !REDIS_IP || !REDIS_PORT || !REDIS_QUEUE_NAME) {
  throw new Error('Missing environment variables')
}

// const scalabilityTest = new ScalabilityTest(REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME)

// scalabilityTest
//   .runTest({
//     minReplicas: 10,
//     maxReplicas: 10,
//     maxVessels: 1000,
//     minVessels: 100,
//     vesselStep: 100,
//     mmsi: 311000263,
//     timestamp: 1725879600,
//   })
//   .then(() => {
//     process.exit(0)
//   })

const profilerTest = new JobProfilingTest(REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME)

profilerTest
  .runTest({
    minReplicas: 7,
    maxReplicas: 10,
    maxVessels: 1000,
    minVessels: 100,
    vesselStep: 100,
    mmsi: 311000263,
    timestamp: 1725879600,
  })
  .then(() => {
    process.exit(0)
  })
