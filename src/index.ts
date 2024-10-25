import { PrismaClient } from '@prisma/client'
import PrismaDatabaseHandler from './implementations/PrismaDatabaseHandler'
import LogicHandler from './implementations/LogicHandler'
import JobHandler from './implementations/JobHandler'
import GRPCController from './implementations/GRPCController'
import GRPCServer from './implementations/GRPCServer'
import Monitor from './implementations/Monitor'
import dotenv from 'dotenv'
import { Queue, QueueEvents } from 'bullmq'

dotenv.config()

const { SERVER_PORT, SERVER_IP } = process.env

if (!SERVER_PORT || !SERVER_IP) {
  throw new Error('Missing environment variables')
}

const databaseClient = new PrismaClient()
const databaseHandler = new PrismaDatabaseHandler(databaseClient)
const logicHandler = new LogicHandler(databaseHandler)
const jobQueue = new Queue('AIS', { connection: { host: 'localhost', port: 6379 } })
const queueEvents = new QueueEvents('foo')
const jobHandler = new JobHandler(logicHandler, databaseHandler, jobQueue, queueEvents)
const controller = new GRPCController(jobHandler, logicHandler, databaseHandler)
const service = new GRPCServer(controller, SERVER_PORT, SERVER_IP)
const monitor = new Monitor([databaseHandler, logicHandler, jobHandler, controller])

// monitor.start()
service.start()
