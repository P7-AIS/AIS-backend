import IGRPCController from '../interfaces/IGRPCController'
import IJobHandler from '../interfaces/IJobHandler'
import IMonitorable from '../interfaces/IMonitorable'
import ILogicHandler from '../interfaces/ILogicHandler'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import * as grpc from '@grpc/grpc-js'

import {
  StreamingRequest,
  StreamingResponse,
  VesselInfoRequest,
  VesselInfoResponse,
  VesselPathRequest,
  VesselPathResponse,
} from '../../proto/AIS-protobuf/ais'
import { Status } from '@grpc/grpc-js/build/src/constants'

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
    const vessel = await this.databaseHandler.getVessel(Number(call.request.vesselId))

    if (!vessel) {
      callback({ code: Status.NOT_FOUND }, null)
      return
    }

    const response: VesselInfoResponse = {
      vesselId: vessel.id,
      name: vessel.name,
      mmsi: vessel.mmsi,
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
      vesselId: 12,
      pathForecast: [],
      pathHistory: [],
    }

    callback({ code: Status.UNIMPLEMENTED }, response)
  }

  startStreaming: grpc.handleBidiStreamingCall<StreamingRequest, StreamingResponse> = (
    call: grpc.ServerDuplexStream<StreamingRequest, StreamingResponse>
  ) => {
    console.log(
      call.on('data', (req) => {
        console.log(req)
      })
    )
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
