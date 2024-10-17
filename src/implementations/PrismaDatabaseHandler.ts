import { PrismaClient, ais_message, ship_type, vessel } from '@prisma/client'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import IMonitorable from '../interfaces/IMonitorable'
import { SimpleVessel, ShipType, Vessel, AisMessage, VesselPath } from '../../AIS-models/models'

interface SimpleVesselResult {
  id: number
  point: Buffer
  time: number
}

interface VesselPathResult {
  path: Buffer
}

export default class DatabaseHandler implements IDatabaseHandler, IMonitorable {
  constructor(private readonly prisma: PrismaClient) {}

  async getAllSimpleVessels(time: Date): Promise<SimpleVessel[] | null> {
    const newestLocs = await this.prisma.$queryRaw<SimpleVesselResult[]>`
      SELECT id, st_endpoint(trajectory) as point, extract(epoch from to_timestamp(st_m(st_endpoint(trajectory)))) as time
      FROM vessel_trajectory
      WHERE to_timestamp(st_m(st_endpoint(trajectory))) 
      BETWEEN to_timestamp(${time.getTime()}) - interval '1 hour' AND to_timestamp(${time.getTime()})
    `

    const headings = await this.prisma.ais_message.findMany({
      where: {
        OR: newestLocs.map((res) => ({
          vessel_mmsi: res.id,
          timestamp: new Date(res.time),
        })),
      },
      select: {
        vessel_mmsi: true,
        heading: true,
      },
    })

    const result = newestLocs.map((loc) => {
      const match = headings.find((heading) => Number(heading.vessel_mmsi) === loc.id)

      return {
        mmsi: loc.id,
        binLocation: loc.point,
        heading: match?.heading === null ? undefined : match?.heading,
      }
    })

    return result
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

  async getVesselPath(mmsi: number, startime: Date, endtime: Date): Promise<VesselPath | null> {
    const pathResult = await this.prisma.$queryRaw<VesselPathResult[]>`
      SELECT st_asbinary(st_filterbym(trajectory, ${startime.getTime()}, ${endtime.getTime()}, true)) as path
      FROM vessel_trajectory
      WHERE mmsi = ${mmsi}
    `

    const headingsResult = await this.prisma.$queryRaw<
      {
        timestamp: number
        heading?: number
      }[]
    >`
      WITH
      subpath AS (
          SELECT st_filterbym(trajectory, ${startime.getTime()}, ${endtime.getTime()}, true) AS filtered_trajectory
          FROM vessel_trajectory
          WHERE mmsi = ${mmsi}
      ),
      times AS (
          SELECT st_m(p.geom) AS timestamp
          FROM st_dumppoints((SELECT filtered_trajectory FROM subpath)) AS p
      )
      SELECT times.timestamp, heading
      FROM times
      JOIN ais_message ON to_timestamp(times.timestamp) = ais_message.timestamp;
    `

    const headings = headingsResult.sort((a, b) => a.timestamp - b.timestamp).map((heading) => heading.heading)

    const result: VesselPath = {
      binPath: pathResult[0].path,
      headings,
    }

    return result
  }

  ///////////////////////////////////////////////////////////

  private convertToVessel(
    vessel: vessel & {
      ship_type: ship_type | null
    }
  ): Vessel {
    return {
      mmsi: Number(vessel.mmsi),
      name: vessel.name || undefined,
      shipType: vessel.ship_type?.name || undefined,
      imo: vessel.imo ? Number(vessel.imo) : undefined,
      callSign: vessel.call_sign ? vessel.call_sign : undefined,
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

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
