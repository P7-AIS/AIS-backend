// Place functions that allows other components to start, stop and manipulate jobs here

import { MonitoredVessel, Point } from '../../AIS-models/models'

export default interface IJobHandler {
  getMonitoredVessels: (selectionArea: Point[], time: Date) => Promise<MonitoredVessel[]>
}
