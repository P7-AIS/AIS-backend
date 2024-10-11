import * as grpc from '@grpc/grpc-js'
import { Status } from '@grpc/grpc-js/build/src/constants'
import IGRPCController from '../interfaces/IGRPCController'
import IJobHandler from '../interfaces/IJobHandler'
import IMonitorable from '../interfaces/IMonitorable'
import ILogicHandler from '../interfaces/ILogicHandler'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import {
  StreamingRequest,
  StreamingResponse,
  VesselInfoRequest,
  VesselInfoResponse,
  VesselPathRequest,
  VesselPathResponse,
} from '../../proto/AIS-protobuf/ais'

export default class GRPCController implements IGRPCController, IMonitorable {
  [metod: string]: any

  constructor(
    private readonly jobHandler: IJobHandler,
    private readonly logicHandler: ILogicHandler,
    private readonly databaseHandler: IDatabaseHandler
  ) {}

  getVesselInfo: grpc.handleUnaryCall<VesselInfoRequest, VesselInfoResponse> = async (
    call: grpc.ServerUnaryCall<VesselInfoRequest, VesselInfoResponse>,
    callback: grpc.sendUnaryData<VesselInfoResponse>
  ) => {
    const vessel = await this.databaseHandler.getVessel(Number(call.request.mmsi))

    if (!vessel) {
      callback({ code: Status.NOT_FOUND }, null)
      return
    }

    const response: VesselInfoResponse = {
      mmsi: vessel.mmsi,
      name: vessel.name,
      shipType: vessel.shipType,
      imo: vessel.imo,
      callSign: vessel.callSign,
      flag: vessel.flag,
      width: vessel.width,
      length: vessel.length,
      positionFixingDevice: vessel.positionFixingDevice,
    }

    callback(null, response)
  }

  getVesselPath: grpc.handleUnaryCall<VesselPathRequest, VesselPathResponse> = (
    call: grpc.ServerUnaryCall<VesselPathRequest, VesselPathResponse>,
    callback: grpc.sendUnaryData<VesselPathResponse>
  ) => {
    const response: VesselPathResponse = {
      mmsi: 12,
      pathForecast: [],
      pathHistory: [],
    }

    callback({ code: Status.UNIMPLEMENTED }, response)
  }

  startStreaming: grpc.handleBidiStreamingCall<StreamingRequest, StreamingResponse> = (
    call: grpc.ServerDuplexStream<StreamingRequest, StreamingResponse>
  ) => {
    let interval: NodeJS.Timeout | null = null

    const writeData = async (data: StreamingRequest) => {
      const allVessels = (await this.databaseHandler.getAllSimpleVessels(new Date(data.startTime))) || []

      const response: StreamingResponse = {
        vessels: allVessels,
        monitoredVessels: [],
      }

      call.write(response)
    }

    call.on('data', (data: StreamingRequest) => {
      if (interval) {
        clearInterval(interval)
      }
      writeData(data)
      interval = setInterval(() => writeData(data), 5000)
    })

    call.on('close', () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    })
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
