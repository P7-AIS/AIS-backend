import { PrismaClient, ais_message, vessel } from '@prisma/client'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import { Vessel } from '../../AIS-models/models/Vessel'
import { AisMessage } from '../../AIS-models/models/AisMessage'
import IMonitorable from '../interfaces/IMonitorable'

export default class DatabaseHandler implements IDatabaseHandler, IMonitorable {
  constructor(private readonly prisma: PrismaClient) {
    this.prisma = prisma
  }
  async getVessel(mmsi: number): Promise<Vessel | null> {
    const result = await this.prisma.vessel.findUnique({
      where: { id: mmsi },
    })

    if (!result) return null

    return this.convertToVessel(result)
  }

  async getVesselHistory(mmsi: number, startime: Date, endtime: Date): Promise<AisMessage[] | null> {
    const result = await this.prisma.ais_message.findMany({
      where: {
        vessel_id: mmsi,
        timestamp: {
          gte: startime,
          lte: endtime,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    if (!result || result.length === 0) return null

    return result.map(this.convertToAisMessage)
  }

  private convertToVessel(vessel: vessel): Vessel {
    return {
      id: Number(vessel.id),
      name: vessel.name,
      mmsi: Number(vessel.mmsi),
      shipTypeId: vessel.ship_type_id ? Number(vessel.ship_type_id) : undefined,
      imo: vessel.imo ? Number(vessel.imo) : undefined,
      callSign: vessel.call_sign ? vessel.call_sign : undefined,
      flag: vessel.flag ? vessel.flag : undefined,
      width: vessel.width ? Number(vessel.width) : undefined,
      length: vessel.length ? Number(vessel.length) : undefined,
      positionFixingDevice: vessel.position_fixing_device ? vessel.position_fixing_device : undefined,
      toBow: vessel.to_bow ? Number(vessel.to_bow) : undefined,
      toStern: vessel.to_stern ? Number(vessel.to_stern) : undefined,
      toPort: vessel.to_port ? Number(vessel.to_port) : undefined,
      toStarboard: vessel.to_starboard ? Number(vessel.to_starboard) : undefined,
    }
  }

  private convertToAisMessage(ais_message: ais_message): AisMessage {
    return {
      id: Number(ais_message.id),
      vesselId: Number(ais_message.vessel_id),
      destinationId: ais_message.destination_id ? Number(ais_message.destination_id) : undefined,
      mobileTypeId: ais_message.mobile_type_id ? Number(ais_message.mobile_type_id) : undefined,
      navigationalStatusId: ais_message.navigational_status_id ? Number(ais_message.navigational_status_id) : undefined,
      dataSourceType: ais_message.data_source_type ? ais_message.data_source_type : undefined,
      timestamp: ais_message.timestamp,
      latitude: parseFloat(ais_message.latitude.toString()),
      longitude: parseFloat(ais_message.longitude.toString()),
      rot: ais_message.rot ? parseFloat(ais_message.rot.toString()) : undefined,
      sog: ais_message.sog ? parseFloat(ais_message.sog.toString()) : undefined,
      cog: ais_message.cog ? parseFloat(ais_message.cog.toString()) : undefined,
      heading: ais_message.heading ? Number(ais_message.heading) : undefined,
      draught: ais_message.draught ? Number(ais_message.draught) : undefined,
      cargoType: ais_message.cargo_type ? ais_message.cargo_type : undefined,
      eta: ais_message.eta ? ais_message.eta : undefined,
    }
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
