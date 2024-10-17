import { PrismaClient, ship_type, vessel } from '@prisma/client'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import IMonitorable from '../interfaces/IMonitorable'
import { SimpleVessel, ShipType, Vessel, VesselPath } from '../../AIS-models/models'

export default class DatabaseHandler implements IDatabaseHandler, IMonitorable {
  constructor(private readonly prisma: PrismaClient) {}

  async getAllSimpleVessels(time: Date): Promise<SimpleVessel[] | null> {
    const newestLocs = await this.prisma.$queryRaw<{ mmsi: number; point: Buffer; heading?: number }[]>`
      WITH 
      endpoints as (
        SELECT mmsi, st_endpoint(st_filterbym(trajectory, 1, ${time.getTime()}, true)) as endpoint
        FROM vessel_trajectory
      ),
      newest_points as (
        SELECT mmsi, endpoint, to_timestamp(st_m(endpoint)) as time
        FROM endpoints
        WHERE endpoint IS NOT NULL
        AND to_timestamp(st_m(endpoint))
        BETWEEN to_timestamp(${time.getTime()}) - interval '1 hour' AND to_timestamp(${time.getTime()})
      )
      SELECT mmsi, st_asbinary(endpoint) as point, heading
      FROM ais_message am, newest_points np
      WHERE am.vessel_mmsi = np.mmsi
      AND am.timestamp = np.time;
    `

    const result: SimpleVessel[] = newestLocs.map((loc) => ({
      mmsi: loc.mmsi,
      binLocation: loc.point,
      heading: loc.heading,
    }))

    return result
  }

  async getVesselPath(mmsi: number, startime: Date, endtime: Date): Promise<VesselPath | null> {
    const pathResult = await this.prisma.$queryRaw<{ path: Buffer }[]>`
      SELECT st_asbinary(st_filterbym(trajectory, ${startime.getTime()}, ${endtime.getTime()}, true)) as path
      FROM vessel_trajectory
      WHERE mmsi = ${mmsi};
    `

    const headingsResult = await this.prisma.$queryRaw<{ heading?: number }[]>`
      WITH
      subpath AS (
          SELECT st_asbinary(st_filterbym(trajectory, ${startime.getTime()}, ${endtime.getTime()}, true)) AS filtered_trajectory
          FROM vessel_trajectory
          WHERE mmsi = ${mmsi}
      ),
      times AS (
          SELECT to_timestamp(st_m(p.geom)) AS timestamp
          FROM st_dumppoints((SELECT filtered_trajectory FROM subpath)) AS p
      )
      SELECT heading
      FROM times t, ais_message am
      WHERE t.timestamp = am.timestamp
      AND am.vessel_mmsi = ${mmsi}
      ORDER BY t.timestamp ASC;
    `

    const result: VesselPath = {
      binPath: pathResult[0].path,
      headings: headingsResult.map((res) => res.heading),
    }

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
