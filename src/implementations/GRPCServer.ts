import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from '../../proto/ais'
import IGRPCController from '../interfaces/IGRPCController'
import IServer from '../interfaces/IServer'

const PROTO_PATH = __dirname + '/../AIS-protobuf/ais.proto'
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: false,
  oneofs: true,
})
const apiProto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType

export default class GRPCServer implements IServer {
  private readonly grpcServer: grpc.Server

  constructor(
    private readonly service: IGRPCController,
    private readonly port: string,
    private readonly ip: string
  ) {
    this.grpcServer = new grpc.Server()
  }

  public start() {
    this.grpcServer.addService(apiProto.protobuf.AISService.service, this.service)
    this.grpcServer.bindAsync(`${this.ip}:${this.port}`, grpc.ServerCredentials.createInsecure(), () => {})
  }

  public stop() {
    this.grpcServer.forceShutdown()
  }
}
