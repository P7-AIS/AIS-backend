import { PrismaClient, ais_message, ship_type, vessel } from '@prisma/client'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import IMonitorable from '../interfaces/IMonitorable'
import { SimpleVessel, ShipType, Vessel, Location, Point, AisMessage } from '../../AIS-models/models'

export default class DatabaseHandler implements IDatabaseHandler, IMonitorable {
  constructor(private readonly prisma: PrismaClient) {}

  async getAllSimpleVessels(time: Date): Promise<SimpleVessel[] | null> {
    const maxTimestamps = await this.prisma.ais_message.groupBy({
      by: ['vessel_mmsi'],
      where: {
        timestamp: {
          gte: new Date(time.getTime() - 10 * 60 * 60 * 1000),
          lte: time,
        },
      },
      _max: {
        timestamp: true,
      },
    })

    const result = await this.prisma.ais_message.findMany({
      where: {
        OR: maxTimestamps.map((maxTimestamp) => ({
          vessel_mmsi: maxTimestamp.vessel_mmsi,
          timestamp: maxTimestamp._max.timestamp!,
        })),
      },
      distinct: ['vessel_mmsi', 'timestamp'],
    })

    return result.map(this.convertToSimpleShip.bind(this))
  }

  async getVessel(mmsi: number): Promise<Vessel | null> {
    const result = await this.prisma.vessel.findUnique({
      where: { mmsi: mmsi },
      include: {
        ship_type: true,
      },
    })

    if (!result) return null

    return this.convertToVessel(result)
  }

  async getVesselType(mmsi: number): Promise<ShipType | null> {
    const result = await this.prisma.ship_type.findUnique({
      where: { id: mmsi },
    })

    if (!result) return null

    return this.convertToVesselType(result)
  }

  async getVesselHistory(mmsi: number, startime: Date, endtime: Date): Promise<AisMessage[] | null> {
    const result = await this.prisma.ais_message.findMany({
      where: {
        vessel_mmsi: mmsi,
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

  ///////////////////////////////////////////////////////////

  private convertToSimpleShip(message: ais_message): SimpleVessel {
    return {
      mmsi: Number(message.vessel_mmsi),
      location: this.convertToLocation(message),
    }
  }

  private convertToLocation(message: ais_message): Location {
    return {
      point: this.convertToPoint(message),
      heading: message.heading ? message.heading : undefined,
      timestamp: message.timestamp.getTime(),
    }
  }

  private convertToPoint(message: ais_message): Point {
    return {
      lat: parseFloat(message.latitude.toString()),
      lon: parseFloat(message.latitude.toString()),
    }
  }

  private convertToVessel(
    vessel: vessel & {
      ship_type: ship_type | null
    }
  ): Vessel {
    return {
      mmsi: Number(vessel.mmsi),
      name: vessel.name,
      shipType: vessel.ship_type?.name || undefined,
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

  private convertToVesselType(ship_type: ship_type): ShipType {
    return {
      id: Number(ship_type.id),
      name: ship_type.name ? ship_type.name : undefined,
    }
  }

  private convertToAisMessage(ais_message: ais_message): AisMessage {
    return {
      id: Number(ais_message.id),
      mmsi: Number(ais_message.vessel_mmsi),
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
