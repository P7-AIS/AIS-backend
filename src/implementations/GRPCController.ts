import * as grpc from '@grpc/grpc-js'
import { Status } from '@grpc/grpc-js/build/src/constants'
import IGRPCController from '../interfaces/IGRPCController'
import IJobHandler from '../interfaces/IJobHandler'
import IMonitorable from '../interfaces/IMonitorable'
import ILogicHandler from '../interfaces/ILogicHandler'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import {
  SimpleVessel,
  StreamingRequest,
  StreamingResponse,
  VesselInfoRequest,
  VesselInfoResponse,
  VesselPath,
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
      width: vessel.width,
      length: vessel.length,
      positionFixingDevice: vessel.positionFixingDevice,
    }

    callback(null, response)
  }

  getVesselPath: grpc.handleUnaryCall<VesselPathRequest, VesselPathResponse> = async (
    call: grpc.ServerUnaryCall<VesselPathRequest, VesselPathResponse>,
    callback: grpc.sendUnaryData<VesselPathResponse>
  ) => {
    const { mmsi, starttime, endtime } = call.request

    const vesselPath = await this.databaseHandler.getVesselPath(mmsi, new Date(starttime), new Date(endtime))

    if (!vesselPath) {
      callback({ code: Status.NOT_FOUND }, null)
      return
    }

    const grpcVesselPath: VesselPath = {
      locations: vesselPath.locations.map((location) => ({
        point: {
          lon: location.point.lon,
          lat: location.point.lat,
        },
        timestamp: location.timestamp.getTime(),
        heading: location.heading,
      })),
    }

    const response: VesselPathResponse = {
      mmsi: mmsi,
      pathForecast: undefined,
      pathHistory: grpcVesselPath,
    }

    callback(null, response)
  }

  startStreaming: grpc.handleServerStreamingCall<StreamingRequest, StreamingResponse> = (
    call: grpc.ServerWritableStream<StreamingRequest, StreamingResponse>
  ) => {
    let interval: NodeJS.Timeout | null = null

    const writeData = async (data: StreamingRequest) => {
      const allVessels = (await this.databaseHandler.getAllSimpleVessels(new Date(data.startTime))) || []

      const grpcVessels: SimpleVessel[] = allVessels.map((vessel) => ({
        mmsi: vessel.mmsi,
        location: {
          point: {
            lon: vessel.location.point.lon,
            lat: vessel.location.point.lat,
          },
          timestamp: vessel.location.timestamp.getTime(),
          heading: vessel.location.heading,
        },
      }))

      const response: StreamingResponse = {
        vessels: grpcVessels,
        monitoredVessels: [],
      }

      call.write(response)
    }

    interval = setInterval(() => writeData(call.request), 5000)

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
