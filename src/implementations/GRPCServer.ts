import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import IGRPCController from '../interfaces/IGRPCController'
import IServer from '../interfaces/IServer'
import { AISServiceService } from '../../proto/AIS-protobuf/ais'
import { ReflectionService } from '@grpc/reflection'

export default class GRPCServer implements IServer {
  private readonly grpcServer: grpc.Server = new grpc.Server()

  constructor(
    private readonly service: IGRPCController,
    private readonly port: string,
    private readonly ip: string
  ) {}

  public start() {
    const pkg = protoLoader.loadSync('AIS-protobuf/ais.proto')
    const reflection = new ReflectionService(pkg)
    reflection.addToServer(this.grpcServer)

    this.grpcServer.addService(AISServiceService, this.service)
    this.grpcServer.bindAsync(`${this.ip}:${this.port}`, grpc.ServerCredentials.createInsecure(), () => {
      console.log(`Server running at ${this.ip}:${this.port}`)
    })
  }

  public stop() {
    this.grpcServer.forceShutdown()
  }
}
