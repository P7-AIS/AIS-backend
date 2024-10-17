// Place functions that allows other components to query from the database here

import { Vessel, AisMessage, ShipType, SimpleVessel } from '../../AIS-models/models'

export default interface IDatabaseHandler {
  getVessel(mmsi: number): Promise<Vessel | null>
  getVesselHistory(mmsi: number, startime: Date, endtime: Date): Promise<AisMessage[] | null>
  getVesselType(mmsi: number): Promise<ShipType | null>
  getAllSimpleVessels(time: Date): Promise<SimpleVessel[] | null>
}
