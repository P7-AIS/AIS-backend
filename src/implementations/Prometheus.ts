import promClient from 'prom-client'
import express, { Request, Response } from 'express'
import dotenv from 'dotenv'

dotenv.config()
const app = express()

const { PROMETHEUS_PORT } = process.env

if (!PROMETHEUS_PORT) {
  throw new Error('Missing environment variables')
}

const register = new promClient.Registry()
register.setDefaultLabels({
  app: 'monitoring-article',
})

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Prometheus server up')
})

app.get('/metrics', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType)
  res.send(await register.metrics())
})

app
  .listen(PROMETHEUS_PORT, () => {
    console.log(`Prometheus metrics server running at 127.0.0.1:${PROMETHEUS_PORT}`)
  })
  .on('error', (error) => {
    throw new Error(error.message)
  })

export const dbQueryTimer = new promClient.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of DB queries in ms',
  labelNames: ['method', 'status'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000, 10000],
})

// promClient.collectDefaultMetrics({ register })
register.registerMetric(dbQueryTimer)

export function observeDBOperation(label: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const observedTimeStart = new Date()
      try {
        const result = await originalMethod.apply(this, args)
        const responseTimeInMs = new Date().getTime() - observedTimeStart.getTime()
        dbQueryTimer.labels(label, 'success').observe(responseTimeInMs)
        return result
      } catch (error) {
        const responseTimeInMs = new Date().getTime() - observedTimeStart.getTime()
        dbQueryTimer.labels(label, 'error').observe(responseTimeInMs)
        throw error
      }
    }
    return descriptor
  }
}
