import { PrismaClient, ship_type, vessel } from '@prisma/client'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import { SimpleVessel, ShipType, Vessel, VesselPath, Point, Trajectory, AisMessage } from '../../AIS-models/models'
import { dbQueryTimer, observeDBOperation } from './Prometheus'

export default class DatabaseHandler implements IDatabaseHandler {
  constructor(private readonly prisma: PrismaClient) {}

  @observeDBOperation('getAllSimpleVessels')
  async getAllSimpleVessels(time: Date): Promise<SimpleVessel[] | null> {
    console.time('getAllSimpleVessels')

    const startTime = time.getTime() - 3600
    const endTime = time.getTime()

    const newestLocs = await this.prisma.$queryRaw<
      { mmsi: bigint; lon: number; lat: number; timestamp: number; heading: number | null }[]
    >`
      WITH 
      endpoints AS (
        SELECT mmsi, ST_EndPoint(ST_FilterByM(trajectory, ${startTime}, ${endTime}, true)) AS endpoint
        FROM vessel_trajectory
      ),
      newest_points AS (
        SELECT mmsi, endpoint, TO_TIMESTAMP(ST_M(endpoint)) AS time
        FROM endpoints
        WHERE endpoint IS NOT NULL
      )
      SELECT mmsi, ST_X(endpoint) AS lon, ST_Y(endpoint) AS lat, ST_M(endpoint) AS timestamp, heading
      FROM newest_points np
      JOIN ais_message am
      ON am.vessel_mmsi = np.mmsi
      AND am.timestamp = np.time;
    `
    console.timeEnd('getAllSimpleVessels')

    const result: SimpleVessel[] = newestLocs.map((loc) => ({
      mmsi: Number(loc.mmsi),
      location: {
        point: {
          lon: loc.lon,
          lat: loc.lat,
        },
        heading: loc.heading ? loc.heading : undefined,
        timestamp: loc.timestamp,
      },
    }))

    return result
  }

  @observeDBOperation('getVesselPath')
  async getVesselPath(mmsi: number, startime: Date, endtime: Date): Promise<VesselPath | null> {
    const results = await this.prisma.$queryRaw<
      { lon: number; lat: number; timestamp: number; heading: number | null }[]
    >`
      WITH
      subpath AS (
          SELECT st_asbinary(st_filterbym(trajectory, ${startime.getTime()}, ${endtime.getTime()}, true)) AS filtered_trajectory
          FROM vessel_trajectory
          WHERE mmsi = ${mmsi}
      ),
      points AS (
          SELECT ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat, TO_TIMESTAMP(ST_M(p.geom)) AS timestamp
          FROM st_dumppoints((SELECT filtered_trajectory FROM subpath)) AS p
      )
      SELECT lon, lat, EXTRACT(epoch from am.timestamp) * 1000 AS timestamp, heading
      FROM points p, ais_message am
      WHERE p.timestamp = am.timestamp
      AND am.vessel_mmsi = ${mmsi}
      ORDER BY p.timestamp ASC;
    `

    const result: VesselPath = {
      locations: results.map((res) => ({
        point: {
          lon: res.lon,
          lat: res.lat,
        },
        timestamp: res.timestamp,
        heading: res.heading ? res.heading : undefined,
      })),
    }

    return result
  }

  @observeDBOperation('getVesselsInArea')
  async getVesselsInArea(selectedArea: Point[], time: Date): Promise<number[] | null> {
    const pointsStr = selectedArea.map((point) => `ST_MakePoint(${point.lon}, ${point.lat})`).join(', ')

    const startTime = time.getTime() - 3600
    const endTime = time.getTime()

    console.time('getVesselsInArea')
    const mmsis = await this.prisma.$queryRawUnsafe<{ mmsi: bigint }[]>(`
      WITH
      endpoints as (
          SELECT mmsi, st_endpoint(st_filterbym(trajectory, ${startTime}, ${endTime}, true)) as endpoint
          FROM vessel_trajectory
      ),
      newest_points as (
          SELECT mmsi, endpoint, to_timestamp(st_m(endpoint)) as time
          FROM endpoints
          WHERE endpoint IS NOT NULL
      )
      SELECT mmsi
      FROM ais_message am
      JOIN newest_points np
      ON am.vessel_mmsi = np.mmsi
      AND am.timestamp = np.time
      AND st_contains(
          st_setsrid(
            st_makepolygon(
              st_makeline(
                ARRAY[${pointsStr}]
              )
          ), 4326),
          np.endpoint
      );
    `)
    console.timeEnd('getVesselsInArea')

    return mmsis.map((mmsi) => Number(mmsi.mmsi))
  }

  @observeDBOperation('getVesselTrajectories')
  async getVesselTrajectories(mmsis: number[], startime: Date, endtime: Date): Promise<Trajectory[] | null> {
    const mmsiStr = mmsis.join(', ')

    const result = await this.prisma.$queryRawUnsafe<{ mmsi: bigint; path: Buffer }[]>(`
      SELECT mmsi, st_asbinary(st_filterbym(trajectory, ${startime.getTime()}, ${endtime.getTime()}, true)) AS path
      FROM vessel_trajectory
      WHERE mmsi IN (${mmsiStr})
    `)

    const trajectories: Trajectory[] = result.map((traj) => ({
      mmsi: Number(traj.mmsi),
      binPath: traj.path,
    }))

    return trajectories
  }

  @observeDBOperation('getVesselMessages')
  async getVesselMessages(mmsis: number[], startime: Date, endtime: Date): Promise<AisMessage[] | null> {
    const mmsiStr = mmsis.join(', ')
    const startimeStr = new Date(startime.getTime() * 1000).toISOString().slice(0, 19).replace('T', ' ')
    const endtimeStr = new Date(endtime.getTime() * 1000).toISOString().slice(0, 19).replace('T', ' ')

    const result = await this.prisma.$queryRawUnsafe<
      {
        id: number
        vessel_mmsi: bigint
        destination: string | null
        mobile_type_id: number | null
        nav_status_id: number | null
        data_source_type: string | null
        timestamp: Date
        cog: number | null
        rot: number | null
        sog: number | null
        heading: number | null
        draught: number | null
        cargo_type: string | null
        eta: Date | null
      }[]
    >(`
      SELECT id, vessel_mmsi, destination, mobile_type_id, nav_status_id, data_source_type, timestamp, cog, rot, sog, heading, draught, cargo_type, eta
      FROM ais_message
      WHERE vessel_mmsi IN (${mmsiStr})
      AND timestamp BETWEEN '${startimeStr}' AND '${endtimeStr}';
    `)

    const messages: AisMessage[] = result.map((msg) => ({
      id: msg.id,
      mmsi: Number(msg.vessel_mmsi),
      timestamp: msg.timestamp,
      destination: msg.destination ? msg.destination : undefined,
      mobileTypeId: msg.mobile_type_id ? msg.mobile_type_id : undefined,
      navigationalStatusId: msg.nav_status_id ? msg.nav_status_id : undefined,
      dataSourceType: msg.data_source_type ? msg.data_source_type : undefined,
      rot: msg.rot ? msg.rot : undefined,
      sog: msg.sog ? msg.sog : undefined,
      cog: msg.cog ? msg.cog : undefined,
      heading: msg.heading ? msg.heading : undefined,
      draught: msg.draught ? msg.draught : undefined,
      cargoType: msg.cargo_type ? msg.cargo_type : undefined,
      eta: msg.eta ? msg.eta : undefined,
    }))

    return messages
  }

  @observeDBOperation('getVessel')
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

  @observeDBOperation('getVesselType')
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
}
