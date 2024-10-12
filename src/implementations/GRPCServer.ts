import * as grpc from '@grpc/grpc-js'
import IGRPCController from '../interfaces/IGRPCController'
import IServer from '../interfaces/IServer'
import { AISServiceService } from '../../proto/AIS-protobuf/ais'

export default class GRPCServer implements IServer {
  private readonly grpcServer: grpc.Server = new grpc.Server()

  constructor(
    private readonly service: IGRPCController,
    private readonly port: string,
    private readonly ip: string
  ) {}

  public start() {
    this.grpcServer.addService(AISServiceService, this.service)
    this.grpcServer.bindAsync(`${this.ip}:${this.port}`, grpc.ServerCredentials.createInsecure(), () => {
      console.log(`Server running at ${this.ip}:${this.port}`)
    })
  }

  public stop() {
    this.grpcServer.forceShutdown()
  }
}
