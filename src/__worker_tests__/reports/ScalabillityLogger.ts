import * as fs from 'fs'

export interface Entry {
  [key: string]: number
}

export default class ScalabilityLogger {
  static ReportToCsv(entries: Entry[], filename: string) {
    if (entries.length === 0) {
      throw new Error('No entries provided.')
    }

    const headers = Object.keys(entries[0]).join(',')
    const rows = entries.map((entry) => Object.values(entry).join(',')).join('\n')
    const csv = `${headers}\n${rows}`

    fs.writeFileSync(filename, csv, 'utf8')
    console.log(`CSV written to ${filename}`)
  }

  static ReportToConsole(entries: Entry[]) {
    const headers = Object.keys(entries[0]).join(',\t')
    const rows = entries.map((entry) => Object.values(entry).join(',\t')).join('\n')

    console.log(headers)
    console.log(rows)
  }
}
