import { PrismaClient } from '@prisma/client'

class DatabaseHandler {
  private readonly prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async getVesselByMmsi(mmsi: number) {
    return this.prisma.vessel.findMany({ where: { id: mmsi } })
  }
}

export default new DatabaseHandler()
