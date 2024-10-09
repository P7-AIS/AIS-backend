import * as grpc from '@grpc/grpc-js'
import IGRPCController from '../interfaces/IGRPCController'
import IJobHandler from '../interfaces/IJobHandler'
import { ShipInfoRequest, ShipInfoRequest__Output } from '../../proto/protobuf/ShipInfoRequest'
import { ShipInfoResponse, ShipInfoResponse__Output } from '../../proto/protobuf/ShipInfoResponse'
import { StartStreamingRequest__Output } from '../../proto/protobuf/StartStreamingRequest'
import { StreamingResponse__Output } from '../../proto/protobuf/StreamingResponse'
import IMonitorable from '../interfaces/IMonitorable'
import ILogicHandler from '../interfaces/ILogicHandler'
import { ShipPathRequest__Output } from '../../proto/protobuf/ShipPathRequest'
import { ShipPathResponse__Output } from '../../proto/protobuf/ShipPathResponse'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import { Vessel } from '../../AIS-models/models/Vessel'

export default class GRPCController implements IGRPCController, IMonitorable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any

  constructor(
    private readonly jobHandler: IJobHandler,
    private readonly logicHandler: ILogicHandler,
    private readonly databaseHandler: IDatabaseHandler
  ) {}

  GetVesselPath(
    call: grpc.ServerUnaryCall<ShipPathRequest__Output, ShipPathResponse__Output>,
    callback: grpc.sendUnaryData<ShipPathResponse__Output>
  ) {
    console.log(call.request.shipId)

    const response: ShipPathResponse__Output = {
      shipId: '',
      pathForecast: [],
      pathHistory: [],
    }

    callback(null, response)
  }

  async GetVesselInfo(
    call: grpc.ServerUnaryCall<ShipInfoRequest, ShipInfoResponse>,
    callback: grpc.sendUnaryData<ShipInfoResponse>
  ) {
    const vessel = await this.databaseHandler.getVessel(Number(call.request.shipId))

    if (vessel == null) {
      const error: grpc.ServerErrorResponse = {
        name: 'NotFoundError',
        message: `Vessel with ID ${call.request.shipId} not found`,
        code: grpc.status.NOT_FOUND,
      }
      callback(error, null)
    } else {
      const response: ShipInfoResponse__Output = {
        id: vessel.id.toString(),
        name: vessel.name,
        mmsi: vessel.mmsi,
        shipType: vessel.shipType,
        imo: 0,
        callSign: '',
        flag: '',
        width: 0,
        length: 0,
        positionFixingDevice: '',
      }

      callback(null, response)
    }
  }

  StartStreaming(call: grpc.ServerDuplexStream<StartStreamingRequest__Output, StreamingResponse__Output>) {
    call.on('data', (request: StartStreamingRequest__Output) => {
      console.log('Received request:', request)

      const response: StreamingResponse__Output = {
        vessels: [],
        monitoredVessels: [],
      }
      call.write(response)
    })

    call.on('end', () => {
      console.log('Stream ended.')
      call.end()
    })

    call.on('error', (err: Error) => {
      console.error('Stream error:', err)
    })
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
