// Place functions that allows other components to query from the database here

import { Vessel, ShipType, SimpleVessel, VesselPath } from '../../AIS-models/models'

export default interface IDatabaseHandler {
  getVessel(mmsi: number): Promise<Vessel | null>
  getVesselPath(mmsi: number, startime: Date, endtime: Date): Promise<VesselPath | null>
  getVesselType(mmsi: number): Promise<ShipType | null>
  getAllSimpleVessels(time: Date): Promise<SimpleVessel[] | null>
}
