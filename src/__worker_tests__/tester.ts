import JobGenerator from './JobGenerator'
import JobProfilingTest from './JobProfilingTest'
import ScalabilityTest from './ScalabilityTest'
import dotenv from 'dotenv'

dotenv.config()

const { SERVER_PORT, SERVER_IP, REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME } = process.env

if (!SERVER_PORT || !SERVER_IP || !REDIS_IP || !REDIS_PORT || !REDIS_QUEUE_NAME) {
  throw new Error('Missing environment variables')
}

const scalabilityTest = new ScalabilityTest(REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME)

scalabilityTest
  .runTest({
    minReplicas: 1,
    maxReplicas: 10,
    maxVessels: 1000,
    minVessels: 100,
    vesselStep: 100,
    mmsi: 111111111,
    timestamp: 2000,
    isFetch: 1,
  })
  .then(() => {
    process.exit(0)
  })

// const profilerTest = new JobProfilingTest(REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME)

// profilerTest
//   .runTest({
//     minReplicas: 1,
//     maxReplicas: 10,
//     maxVessels: 1000,
//     minVessels: 100,
//     vesselStep: 100,
//     mmsi: 111111111,
//     timestamp: 2000,
//     isFetch: 1,
//   })
//   .then(() => {
//     process.exit(0)
//   })

// const jobGenerator = new JobGenerator()

// jobGenerator.uploadVesselDataForTesting(111111111, 1800)
