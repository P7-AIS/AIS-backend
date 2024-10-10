import { Vessel } from '../../AIS-models/models/Vessel'
import { AisMessage } from '../../AIS-models/models/AisMessage'
import { ShipType } from '../../AIS-models/models/ShipType'

// Place functions that allows other components to query from the database here

export default interface IDatabaseHandler {
  getVessel(mmsi: number): Promise<Vessel | null>
  getVesselHistory(mmsi: number, startime: Date, endtime: Date): Promise<AisMessage[] | null>
  getVesselType(mmsi: number): Promise<ShipType | null>
}
