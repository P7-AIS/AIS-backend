import ScalabilityTest from './ScalabilityTest'
import dotenv from 'dotenv'

dotenv.config()

const { SERVER_PORT, SERVER_IP, REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME } = process.env

if (!SERVER_PORT || !SERVER_IP || !REDIS_IP || !REDIS_PORT || !REDIS_QUEUE_NAME) {
  throw new Error('Missing environment variables')
}

const scalabilityTest = new ScalabilityTest(REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME)

scalabilityTest.runTest({ maxReplicas: 10, maxVessels: 100, minVessels: 50, vesselStep: 10 }).then(() => {
  process.exit(0)
})
