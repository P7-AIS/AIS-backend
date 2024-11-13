import { PrismaClient } from '@prisma/client'
import PrismaDatabaseHandler from './implementations/PrismaDatabaseHandler'
import LogicHandler from './implementations/LogicHandler'
import JobHandler from './implementations/JobHandler'
import GRPCController from './implementations/GRPCController'
import GRPCServer from './implementations/GRPCServer'
import dotenv from 'dotenv'
import { Queue, QueueEvents } from 'bullmq'

dotenv.config()

const { SERVER_PORT, SERVER_IP, REDIS_IP, REDIS_PORT, REDIS_QUEUE_NAME } = process.env

if (!SERVER_PORT || !SERVER_IP || !REDIS_IP || !REDIS_PORT || !REDIS_QUEUE_NAME) {
  throw new Error('Missing environment variables')
}

const databaseClient = new PrismaClient()
const databaseHandler = new PrismaDatabaseHandler(databaseClient)
const logicHandler = new LogicHandler(databaseHandler)
const jobQueue = new Queue(REDIS_QUEUE_NAME, { connection: { host: REDIS_IP, port: Number(REDIS_PORT) } })
const queueEvents = new QueueEvents(REDIS_QUEUE_NAME, { connection: { host: REDIS_IP, port: Number(REDIS_PORT) } })
const jobHandler = new JobHandler(logicHandler, databaseHandler, jobQueue, queueEvents)
const controller = new GRPCController(jobHandler, logicHandler, databaseHandler)
const service = new GRPCServer(controller, SERVER_PORT, SERVER_IP)

service.start()
