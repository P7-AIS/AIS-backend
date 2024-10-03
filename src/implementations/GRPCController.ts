import * as grpc from '@grpc/grpc-js'
import IGRPCController from '../interfaces/IGRPCController'
import IJobHandler from '../interfaces/IJobHandler'
import { ShipInfoRequest__Output } from '../../proto/protobuf/ShipInfoRequest'
import { ShipInfoResponse__Output } from '../../proto/protobuf/ShipInfoResponse'
import { StartStreamingRequest__Output } from '../../proto/protobuf/StartStreamingRequest'
import { StreamingResponse__Output } from '../../proto/protobuf/StreamingResponse'
import IMonitorable from '../interfaces/IMonitorable'
import ILogicHandler from '../interfaces/ILogicHandler'

export default class GRPCController implements IGRPCController, IMonitorable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any

  constructor(
    private readonly jobHandler: IJobHandler,
    private readonly logicHandler: ILogicHandler
  ) {
    this.jobHandler = jobHandler
    this.logicHandler = logicHandler
  }

  GetShipInfo(
    call: grpc.ServerUnaryCall<ShipInfoRequest__Output, ShipInfoResponse__Output>,
    callback: grpc.sendUnaryData<ShipInfoResponse__Output>
  ) {
    console.log(call.request.shipId)

    const response: ShipInfoResponse__Output = {
      id: '',
      name: '',
      mmsi: 0,
      shipType: '',
      imo: 0,
      callSign: '',
      flag: '',
      width: 0,
      length: 0,
      positionFixingDevice: '',
      pathForecast: [],
      pathHistory: [],
    }

    callback(null, response)
  }

  StartStreaming(call: grpc.ServerWritableStream<StartStreamingRequest__Output, StreamingResponse__Output>) {
    console.log(call.request.points?.length)

    const response: StreamingResponse__Output = {
      ships: [],
      monitoredShips: [],
    }

    call.write(response)
    call.end()
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
