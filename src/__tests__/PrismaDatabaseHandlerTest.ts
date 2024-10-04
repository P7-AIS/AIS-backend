import { PrismaClient, vessel } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import PrismaDatabaseHandler from '../implementations/PrismaDatabaseHandler'
import { Vessel } from '../../AIS-models/Vessel'

// Mock Prisma Client
const prismaMock = mockDeep<PrismaClient>()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}))

// Test suite for the getVessel method
describe('DatabaseHandler - getVessel', () => {
  let databaseHandler: PrismaDatabaseHandler

  // Setup: runs before each test
  beforeEach(() => {
    databaseHandler = new PrismaDatabaseHandler(prismaMock)
  })

  // Cleanup: runs after each test to reset mocks
  afterEach(() => {
    jest.clearAllMocks()
  })

  // Test case for a valid MMSI
  it('should return a Vessel when a valid MMSI is provided and found', async () => {
    const mockVessel: vessel = {
      id: BigInt(123456789),
      name: 'Test Vessel',
      mmsi: BigInt(123456789),
      ship_type_id: null,
      imo: null,
      call_sign: null,
      flag: null,
      width: null,
      length: null,
      position_fixing_device: null,
      to_bow: null,
      to_stern: null,
      to_port: null,
      to_starboard: null,
    }

    prismaMock.vessel.findUnique.mockResolvedValue(mockVessel)

    const result = await databaseHandler.getVessel(123456789)

    expect(result).toEqual<Vessel>({
      id: 123456789,
      name: 'Test Vessel',
      mmsi: 123456789,
    })

    expect(prismaMock.vessel.findUnique).toHaveBeenCalledWith({
      where: { id: 123456789 },
    })
  })

  // Test case for no vessel found
  it('should return null when no vessel is found', async () => {
    prismaMock.vessel.findUnique.mockResolvedValue(null)

    const result = await databaseHandler.getVessel(123456789)

    expect(result).toBeNull()
    expect(prismaMock.vessel.findUnique).toHaveBeenCalledWith({
      where: { id: 123456789 },
    })
  })
})
