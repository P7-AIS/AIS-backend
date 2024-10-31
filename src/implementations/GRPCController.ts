import * as grpc from '@grpc/grpc-js'
import { Status } from '@grpc/grpc-js/build/src/constants'
import IGRPCController from '../interfaces/IGRPCController'
import IJobHandler from '../interfaces/IJobHandler'
import IMonitorable from '../interfaces/IMonitorable'
import ILogicHandler from '../interfaces/ILogicHandler'
import IDatabaseHandler from '../interfaces/IDatabaseHandler'
import {
  MonitoredVesselsRequest,
  MonitoredVesselsResponse,
  SimpleVessel,
  SimpleVesselsRequest,
  SimpleVesselsResponse,
  StreamingRequest,
  StreamingResponse,
  VesselInfoRequest,
  VesselInfoResponse,
  VesselPath,
  VesselPathRequest,
  VesselPathResponse,
} from '../../proto/AIS-protobuf/ais'
import { MonitoredVessel } from '../../AIS-models/models'

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
        timestamp: location.timestamp,
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

  getSimpleVessels: grpc.handleUnaryCall<SimpleVesselsRequest, SimpleVesselsResponse> = async (
    call: grpc.ServerUnaryCall<SimpleVesselsRequest, SimpleVesselsResponse>,
    callback: grpc.sendUnaryData<SimpleVesselsResponse>
  ) => {
    const simpleVessels = await this.databaseHandler.getAllSimpleVessels(new Date(call.request.timestamp))

    if (!simpleVessels) {
      callback({ code: Status.NOT_FOUND }, null)
      return
    }

    const grpcSimpleVessels: SimpleVessel[] = simpleVessels.map((vessel) => ({
      mmsi: vessel.mmsi,
      location: {
        point: {
          lon: vessel.location.point.lon,
          lat: vessel.location.point.lat,
        },
        timestamp: vessel.location.timestamp,
        heading: vessel.location.heading,
      },
    }))

    const response: SimpleVesselsResponse = {
      vessels: grpcSimpleVessels,
    }

    callback(null, response)
  }

  getMonitoredVessels: grpc.handleUnaryCall<MonitoredVesselsRequest, MonitoredVesselsResponse> = async (
    call: grpc.ServerUnaryCall<MonitoredVesselsRequest, MonitoredVesselsResponse>,
    callback: grpc.sendUnaryData<MonitoredVesselsResponse>
  ) => {
    if (call.request.selectedArea.length < 4) {
      callback({ code: Status.INVALID_ARGUMENT }, null)
      return
    }

    const monitoredVessels = await this.jobHandler.getMonitoredVessels(
      call.request.selectedArea,
      new Date(call.request.timestamp)
    )

    const grpcMonitoredVessels: MonitoredVessel[] = monitoredVessels.map((vessel) => ({
      mmsi: vessel.mmsi,
      reason: vessel.reason,
      trustworthiness: vessel.trustworthiness,
    }))

    const response: MonitoredVesselsResponse = {
      vessels: grpcMonitoredVessels,
    }

    callback(null, response)
  }

  startStreaming: grpc.handleServerStreamingCall<StreamingRequest, StreamingResponse> = (
    call: grpc.ServerWritableStream<StreamingRequest, StreamingResponse>
  ) => {
    const randomStreamName = Math.random().toString(36).substring(7)

    let deliverInterval: NodeJS.Timeout | null = null
    let heartbeatInterval: NodeJS.Timeout = setInterval(() => {
      console.log(randomStreamName, new Date().getTime(), call.cancelled, call.closed, call.writable)
    }, 5000)

    const writeData = async (data: StreamingRequest) => {
      if (!call.writable) {
        endStream()
        return
      }

      const simpleVessels = (await this.databaseHandler.getAllSimpleVessels(new Date(data.startTime))) || []

      let monitoredVessels: MonitoredVessel[] = []

      if (data.selectedArea.length >= 4) {
        monitoredVessels = await this.jobHandler.getMonitoredVessels(data.selectedArea, new Date(data.startTime))
      }

      const grpcVessels: SimpleVessel[] = simpleVessels.map((vessel) => ({
        mmsi: vessel.mmsi,
        location: {
          point: {
            lon: vessel.location.point.lon,
            lat: vessel.location.point.lat,
          },
          timestamp: vessel.location.timestamp,
          heading: vessel.location.heading,
        },
      }))

      const response: StreamingResponse = {
        vessels: grpcVessels,
        monitoredVessels: monitoredVessels,
      }

      call.write(response)
    }

    const endStream = () => {
      console.log('ending stream')
      if (deliverInterval) {
        clearInterval(heartbeatInterval)
        clearInterval(deliverInterval)
        deliverInterval = null
      }
      call.end()
    }

    writeData(call.request)

    deliverInterval = setInterval(async () => {
      await writeData(call.request)
    }, 1000000)

    call.on('cancelled', () => {
      console.log('Stream cancelled by client.')
      endStream()
    })

    call.on('end', () => {
      console.log('Stream ended.')
      endStream()
    })
  }

  getAccumulatedLogs(): string[] {
    throw new Error('Method not implemented.')
  }
}
