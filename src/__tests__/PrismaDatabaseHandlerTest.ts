import { PrismaClient, ship_type, vessel } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import PrismaDatabaseHandler from '../implementations/PrismaDatabaseHandler'
import { AisMessage, Point, ShipType, Trajectory, Vessel, VesselPath } from '../../AIS-models/models'
import { SimpleVessel } from '../../proto/AIS-protobuf/ais'

// Mock Prisma Client
const prismaMock = mockDeep<PrismaClient>()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}))

let databaseHandler: PrismaDatabaseHandler

// Setup: runs before each test
beforeEach(() => {
  databaseHandler = new PrismaDatabaseHandler(prismaMock)
})

// Cleanup: runs after each test to reset mocks
afterEach(() => {
  jest.clearAllMocks()
})

// Test suite for the getVessel method
describe('DatabaseHandler - getVessel', () => {
  it('should return a Vessel when a valid MMSI is provided and found', async () => {
    const mockVessel: vessel = {
      mmsi: BigInt(123456789),
      name: 'the vessel',
      ship_type_id: null,
      imo: null,
      call_sign: null,
      width: null,
      length: null,
      position_fixing_device: null,
      to_bow: null,
      to_stern: null,
      to_port: null,
      to_starboard: null,
      country_id: null,
    }

    prismaMock.vessel.findUnique.mockResolvedValue(mockVessel)

    const res = await databaseHandler.getVessel(123456789)

    expect(res).toEqual<Vessel>({
      mmsi: 123456789,
      name: 'the vessel',
    })
  })

  it('should return null if vessel is not found', async () => {
    prismaMock.vessel.findUnique.mockResolvedValue(null)
    const res = await databaseHandler.getVessel(1234)
    expect(res).toBe(null)
  })
})

describe('DatabaseHandler - converters', () => {
  it('should convert prisma vessel to models Vessel', () => {
    const prismaVessel: vessel & {
      ship_type: ship_type | null
    } = {
      mmsi: BigInt(123456789),
      name: 'the vessel',
      ship_type_id: 123,
      imo: 123,
      call_sign: 'maverick',
      width: 12,
      length: 13,
      position_fixing_device: 'gps',
      to_bow: 21,
      to_stern: 31,
      to_port: 41,
      to_starboard: 51,
      country_id: 1,
      ship_type: { id: 123, name: 'tanker' },
    }

    const privateMethodProto = Object.getPrototypeOf(databaseHandler)
    const res = privateMethodProto.convertToVessel(prismaVessel)

    expect(res).toEqual<Vessel>({
      mmsi: 123456789,
      name: 'the vessel',
      shipType: 'tanker',
      imo: 123,
      callSign: 'maverick',
      width: 12,
      length: 13,
      positionFixingDevice: 'gps',
      toBow: 21,
      toStern: 31,
      toPort: 41,
      toStarboard: 51,
    })
  })

  it('should convert prisma vessel with null fields to models Vessel with undefined fields', () => {
    const prismaVessel: vessel & {
      ship_type: ship_type | null
    } = {
      mmsi: BigInt(123456789),
      name: null,
      ship_type_id: null,
      imo: null,
      call_sign: null,
      width: null,
      length: null,
      position_fixing_device: null,
      to_bow: null,
      to_stern: null,
      to_port: null,
      to_starboard: null,
      country_id: null,
      ship_type: null,
    }

    const privateMethodProto = Object.getPrototypeOf(databaseHandler) //to test private method this is necessary https://stackoverflow.com/questions/48906484/how-to-unit-test-private-methods-in-typescript
    const res = privateMethodProto.convertToVessel(prismaVessel)

    expect(res).toEqual<Vessel>({
      mmsi: 123456789,
      name: undefined,
      shipType: undefined,
      imo: undefined,
      callSign: undefined,
      width: undefined,
      length: undefined,
      positionFixingDevice: undefined,
      toBow: undefined,
      toStern: undefined,
      toPort: undefined,
      toStarboard: undefined,
    })
  })

  it('should convert vessel type to shipType', () => {
    const prismaShipType: ship_type = {
      id: 123,
      name: 'maverick',
    }

    const privateMethodProto = Object.getPrototypeOf(databaseHandler) //to test private method this is necessary https://stackoverflow.com/questions/48906484/how-to-unit-test-private-methods-in-typescript
    const res = privateMethodProto.convertToVesselType(prismaShipType)
    expect(res).toEqual<ShipType>({
      id: 123,
      name: 'maverick',
    })
  })
})

describe('DatabaseHandler - getAllSimpleVessels', () => {
  it('should return SimpleVessel objects when data is returned from the query', async () => {
    const testDate = new Date('2024-01-01T12:00:00Z')
    const mockQueryResult = [
      {
        mmsi: BigInt(123456789),
        lon: 100.5,
        lat: -45.5,
        timestamp: 1641013200000,
        heading: 90,
      },
      {
        mmsi: BigInt(987654321),
        lon: 101.5,
        lat: -46.5,
        timestamp: 1641016800000,
        heading: null,
      },
    ]

    prismaMock.$queryRaw.mockResolvedValue(mockQueryResult)
    const result = await databaseHandler.getAllSimpleVessels(testDate)

    const expectedOutput: SimpleVessel[] = [
      {
        mmsi: 123456789,
        location: {
          point: {
            lon: 100.5,
            lat: -45.5,
          },
          heading: 90,
          timestamp: 1641013200000,
        },
      },
      {
        mmsi: 987654321,
        location: {
          point: {
            lon: 101.5,
            lat: -46.5,
          },
          heading: undefined,
          timestamp: 1641016800000,
        },
      },
    ]

    expect(result).toEqual(expectedOutput)
  })

  it('should return an empty array when the query returns no results', async () => {
    const testDate = new Date('2024-01-01T12:00:00Z')
    prismaMock.$queryRaw.mockResolvedValue([])
    const result = await databaseHandler.getAllSimpleVessels(testDate)
    expect(result).toEqual([])
  })

  it('should handle null heading values correctly', async () => {
    const testDate = new Date('2024-01-01T12:00:00Z')
    const mockQueryResult = [
      {
        mmsi: BigInt(123456789),
        lon: 100.5,
        lat: -45.5,
        timestamp: 1641013200000,
        heading: null,
      },
    ]
    prismaMock.$queryRaw.mockResolvedValue(mockQueryResult)
    const result = await databaseHandler.getAllSimpleVessels(testDate)
    const expectedOutput: SimpleVessel[] = [
      {
        mmsi: 123456789,
        location: {
          point: {
            lon: 100.5,
            lat: -45.5,
          },
          heading: undefined,
          timestamp: 1641013200000,
        },
      },
    ]
    expect(result).toEqual(expectedOutput)
  })
})

describe('DatabaseHandler - getVesselPath', () => {
  it('should return SimpleVessel objects when data is returned from the query', async () => {
    const start = new Date('123456789')
    const end = new Date('234567890')
    const mmsi = 12345
    const mockQueryResult = [
      {
        lon: 100.5,
        lat: -45.5,
        timestamp: 1641013200000,
        heading: 90,
      },
      {
        lon: 95,
        lat: 95,
        timestamp: 12345,
        heading: null,
      },
      {
        lon: 100.5,
        lat: -45.5,
        timestamp: 1641013200000,
        heading: 90,
      },
    ]

    prismaMock.$queryRaw.mockResolvedValue(mockQueryResult)
    const result = await databaseHandler.getVesselPath(mmsi, start, end)

    const expectedOutput: VesselPath = {
      locations: [
        {
          point: {
            lon: 100.5,
            lat: -45.5,
          },
          timestamp: 1641013200000,
          heading: 90,
        },
        {
          point: {
            lon: 95,
            lat: 95,
          },
          timestamp: 12345,
          heading: undefined,
        },
        {
          point: {
            lon: 100.5,
            lat: -45.5,
          },
          timestamp: 1641013200000,
          heading: 90,
        },
      ],
    }

    expect(result).toEqual(expectedOutput)
  })

  it('should return vesselpath with empty locations array if no path found by query', async () => {
    const start = new Date('123456789')
    const end = new Date('234567890')
    const mmsi = 12345

    prismaMock.$queryRaw.mockResolvedValue([])
    const result = await databaseHandler.getVesselPath(mmsi, start, end)
    expect(result).toEqual<VesselPath>({ locations: [] })
  })
})

describe('DatabaseHandler - getVesselsInArea', () => {
  it('should return array of mmsis if return by query', async () => {
    const area: Point[] = [] //not used for anything
    const time = new Date()

    const queryRes = [{ mmsi: 123 }, { mmsi: 234 }, { mmsi: 345 }, { mmsi: 456 }]
    prismaMock.$queryRawUnsafe.mockResolvedValue(queryRes)
    const expectedRes = [123, 234, 345, 456]
    const res = await databaseHandler.getVesselsInArea(area, time)
    expect(res).toEqual(expectedRes)
  })

  it('should return empty array if no mmsis return by query', async () => {
    const area: Point[] = [] //not used for anything
    const time = new Date()

    const queryRes: { mmsi: bigint }[] = []
    prismaMock.$queryRawUnsafe.mockResolvedValue(queryRes)
    const expectedRes: Number[] = []
    const res = await databaseHandler.getVesselsInArea(area, time)
    expect(res).toEqual(expectedRes)
  })
})

describe('DatabaseHandler - getVesselTrajectories', () => {
  it('should return trajectory array if trajectories are returned by query', async () => {
    const mmsis = [123, 234, 345]
    const start = new Date()
    const end = new Date()

    const queryRes = [
      { mmsi: 123, path: Buffer.from('buffer1', 'utf-8') },
      { mmsi: 234, path: Buffer.from('buffer2', 'utf-8') },
      { mmsi: 345, path: Buffer.from('buffer3', 'utf-8') },
    ]
    prismaMock.$queryRawUnsafe.mockResolvedValue(queryRes)
    const expectedRes: Trajectory[] = [
      { mmsi: 123, binPath: Buffer.from('buffer1', 'utf-8') },
      { mmsi: 234, binPath: Buffer.from('buffer2', 'utf-8') },
      { mmsi: 345, binPath: Buffer.from('buffer3', 'utf-8') },
    ]

    const res = await databaseHandler.getVesselTrajectories(mmsis, start, end)
    expect(res).toEqual(expectedRes)
  })

  it('should return empty trajectory array if no trajectories are returned by query', async () => {
    const mmsis: number[] = []
    const start = new Date()
    const end = new Date()
    const queryRes: { mmsi: bigint; path: Buffer }[] = []
    const expectedRes: Trajectory[] = []
    prismaMock.$queryRawUnsafe.mockResolvedValue(queryRes)
    const res = await databaseHandler.getVesselTrajectories(mmsis, start, end)
    expect(res).toEqual(expectedRes)
  })
})

describe('DatabaseHandler - getVesselMessages', () => {
  it('should return empty messages array if no messages returned by query', async () => {
    const mmsis: number[] = []
    const start = new Date()
    const end = new Date()

    const queryRes: any = [] ///to not write entire type again
    prismaMock.$queryRawUnsafe.mockResolvedValue(queryRes)
    const res = await databaseHandler.getVesselMessages(mmsis, start, end)
    expect(res).toEqual([])
  })

  it('should return array of ais messages when query returns results', async () => {
    const mmsis: number[] = []
    const start = new Date()
    const end = new Date()
    const date = new Date()
    const queryRes: {
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
    }[] = [
      {
        id: 1,
        vessel_mmsi: BigInt(123),
        destination: null,
        mobile_type_id: null,
        nav_status_id: null,
        data_source_type: null,
        timestamp: date,
        cog: null,
        rot: null,
        sog: null,
        heading: null,
        draught: null,
        cargo_type: null,
        eta: null,
      },
      {
        id: 2,
        vessel_mmsi: BigInt(234),
        destination: 'test',
        mobile_type_id: 2,
        nav_status_id: 3,
        data_source_type: 'this',
        timestamp: date,
        cog: 12,
        rot: 23,
        sog: 34,
        heading: 189,
        draught: 18,
        cargo_type: 'tanker',
        eta: new Date('2024-01-01'),
      },
    ]
    prismaMock.$queryRawUnsafe.mockResolvedValue(queryRes)
    const res = await databaseHandler.getVesselMessages(mmsis, start, end)
    const expectedRes: AisMessage[] = [
      {
        id: 1,
        mmsi: 123,
        timestamp: date,
        destination: undefined,
        mobileTypeId: undefined,
        navigationalStatusId: undefined,
        dataSourceType: undefined,
        rot: undefined,
        sog: undefined,
        cog: undefined,
        heading: undefined,
        draught: undefined,
        cargoType: undefined,
        eta: undefined,
      },
      {
        id: 2,
        mmsi: 234,
        timestamp: date,
        destination: 'test',
        mobileTypeId: 2,
        navigationalStatusId: 3,
        dataSourceType: 'this',
        cog: 12,
        rot: 23,
        sog: 34,
        heading: 189,
        draught: 18,
        cargoType: 'tanker',
        eta: new Date('2024-01-01'),
      },
    ]
    expect(res).toEqual(expectedRes)
  })
})
