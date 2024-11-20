import ScalabilityLogger, { Entry } from './ScalabillityLogger'

export interface TestReportEntry extends Entry {
  replicas: number
  vessels: number
  duration: number
}

export interface FixedTestConfig {
  minVessels: number
  maxVessels: number
  vesselStep: number
  maxReplicas: number
}

export default class FixedTestReport {
  private readonly entris: TestReportEntry[] = []
  private readonly filename: string

  constructor(private readonly config: FixedTestConfig) {
    this.filename = this.getFilenameFromConfig()
  }

  addEntry(entry: TestReportEntry) {
    this.entris.push(entry)
  }

  outputReport(outDir: string) {
    ScalabilityLogger.ReportToCsv(this.entris, `${outDir}/${this.filename}`)
  }

  private getFilenameFromConfig() {
    const time = new Date().getTime()
    return `fixed_test_report_${this.config.maxReplicas}_${this.config.minVessels}_${this.config.maxVessels}_${this.config.vesselStep}_${time}.csv`
  }
}
