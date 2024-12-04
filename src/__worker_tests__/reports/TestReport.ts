import ScalabilityLogger, { Entry } from './ScalabillityLogger'

export interface TestReportEntry extends Entry {
  replicas: number
  vessels: number
  duration: number
}

export interface JobProfileEntry extends Entry {
  replicas: number
  vessels: number
  jobCreation: number
  queueingForWorker: number
  dbQuerying: number
  algorithm: number
  queueingForBackend: number
}

export interface FixedTestConfig extends TestConfig {
  minVessels: number
  maxVessels: number
  vesselStep: number
  minReplicas: number
  maxReplicas: number
  mmsi: number
  timestamp: number
  isFetch: number
}

interface TestConfig {
  [key: string]: number
}

export default class TestReport<T extends Entry> {
  private readonly entries: T[] = []
  private readonly filename: string

  constructor(private readonly config: TestConfig) {
    this.filename = this.getFilenameFromConfig()
  }

  addEntry(entry: T) {
    this.entries.push(entry)
  }

  outputReport(outDir: string) {
    ScalabilityLogger.ReportToCsv(this.entries, `${outDir}/${this.filename}`)
  }

  private getFilenameFromConfig() {
    const time = new Date().getTime()
    const vals = Object.values(this.config)
    const str = vals.join('_')
    return `test_report_${time}_${str}.csv`
  }
}
