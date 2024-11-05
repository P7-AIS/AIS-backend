import { PrismaClient, ship_type, vessel } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import PrismaDatabaseHandler from '../implementations/PrismaDatabaseHandler'
import { ShipType, Vessel } from '../../AIS-models/models'
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
  it('should return transformed SimpleVessel objects when data is returned from the query', async () => {
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
