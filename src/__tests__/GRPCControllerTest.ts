import { mockDeep } from 'jest-mock-extended'
import LogicHandler from '../implementations/LogicHandler'
import DatabaseHandler from '../implementations/PrismaDatabaseHandler'
import JobHandler from '../implementations/JobHandler'
import GRPCController from '../implementations/GRPCController'
import * as grpc from '@grpc/grpc-js'
import { Status } from '@grpc/grpc-js/build/src/constants'
import {
  MonitoredVesselsRequest,
  MonitoredVesselsResponse,
  SimpleVesselsRequest,
  SimpleVesselsResponse,
  VesselInfoRequest,
  VesselInfoResponse,
  VesselPathRequest,
  VesselPathResponse,
} from '../../proto/AIS-protobuf/ais'
import { MonitoredVessel, SimpleVessel, Vessel, VesselPath } from '../../AIS-models/models'

const logicHandlerMock = mockDeep<LogicHandler>()
const databaseHandlerMock = mockDeep<DatabaseHandler>()
const jobHandlerMock = mockDeep<JobHandler>()

jest.mock('../implementations/PrismaDatabaseHandler', () => ({
  DatabaseHandler: jest.fn(() => databaseHandlerMock),
}))
jest.mock('../implementations/LogicHandler', () => ({
  LogicHandler: jest.fn(() => logicHandlerMock),
}))
jest.mock('../implementations/JobHandler', () => ({
  JobHandler: jest.fn(() => jobHandlerMock),
}))

let grpcController: GRPCController
beforeEach(() => {
  grpcController = new GRPCController(jobHandlerMock, logicHandlerMock, databaseHandlerMock)
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GRPCController - getVesselInfo', () => {
  it('should call callback with Status.NOT_FOUND if vessel not found', async () => {
    // Arrange: mock the database handler to return null
    const call = mockDeep<grpc.ServerUnaryCall<VesselInfoRequest, VesselInfoResponse>>()
    const callback = jest.fn()
    call.request = { mmsi: 123456789, timestamp: 4321 }
    databaseHandlerMock.getVessel.mockResolvedValue(null)
    await grpcController.getVesselInfo(call, callback)

    expect(callback).toHaveBeenCalledWith({ code: Status.NOT_FOUND }, null)
  })

  it('should return vessel info if vessel is found', async () => {
    const call = mockDeep<grpc.ServerUnaryCall<VesselInfoRequest, VesselInfoResponse>>()
    const callback = jest.fn()
    call.request = { mmsi: 123456789, timestamp: 123 }
    const vessel: Vessel = {
      mmsi: 123456789,
      name: 'Tom',
      shipType: 'tanker',
      imo: 12,
      callSign: 'mavrick',
      width: 21,
      length: 43,
      positionFixingDevice: 'superglue',
    }
    databaseHandlerMock.getVessel.mockResolvedValue(vessel) // Simulate vessel found
    await grpcController.getVesselInfo(call, callback)
    const expectedVessel: VesselInfoResponse = {
      mmsi: 123456789,
      name: 'Tom',
      shipType: 'tanker',
      imo: 12,
      callSign: 'mavrick',
      width: 21,
      length: 43,
      positionFixingDevice: 'superglue',
    }
    expect(callback).toHaveBeenCalledWith(null, expectedVessel)
  })
})

describe('GRPCController - getVesselPath', () => {
  it('should return (not found, null) if no vesselPath found', async () => {
    // Arrange: mock the database handler to return null
    const call = mockDeep<grpc.ServerUnaryCall<VesselPathRequest, VesselPathResponse>>()
    const callback = jest.fn()
    call.request = { mmsi: 123456789, starttime: 4321, endtime: 12345 }
    databaseHandlerMock.getVesselPath.mockResolvedValue(null)
    await grpcController.getVesselPath(call, callback)
    expect(callback).toHaveBeenCalledWith({ code: Status.NOT_FOUND }, null)
  })

  it('should return vesselPathResponse if path found in db', async () => {
    const call = mockDeep<grpc.ServerUnaryCall<VesselPathRequest, VesselPathResponse>>()
    const callback = jest.fn()
    call.request = { mmsi: 123456789, starttime: 4321, endtime: 12345 }
    const dbResponse: VesselPath = {
      locations: [
        {
          point: { lat: 12, lon: 12 },
          heading: 123,
          timestamp: 222,
        },
      ],
    }

    databaseHandlerMock.getVesselPath.mockResolvedValue(dbResponse)
    await grpcController.getVesselPath(call, callback)

    const expectedRes: VesselPathResponse = {
      mmsi: 123456789,
      pathHistory: dbResponse,
      pathForecast: undefined,
    }
    expect(callback).toHaveBeenCalledWith(null, expectedRes)
  })
})

describe('GRPCController - getSimpleVessels', () => {
  it('should return (status.error, null) if no vessels found in db', async () => {
    const call = mockDeep<grpc.ServerUnaryCall<SimpleVesselsRequest, SimpleVesselsResponse>>()
    const callback = jest.fn()
    call.request = { timestamp: 123 }
    databaseHandlerMock.getAllSimpleVessels.mockResolvedValue(null)
    await grpcController.getSimpleVessels(call, callback)
    expect(callback).toHaveBeenCalledWith({ code: Status.NOT_FOUND }, null)
  })

  it('should return list of simple vessels if returned by database', async () => {
    const call = mockDeep<grpc.ServerUnaryCall<SimpleVesselsRequest, SimpleVesselsResponse>>()
    const callback = jest.fn()
    call.request = { timestamp: 123 }
    const dbResult: SimpleVessel[] = [
      {
        mmsi: 321,
        location: {
          point: {
            lat: 12,
            lon: 90,
          },
          timestamp: 100,
          heading: 12,
        },
      },
    ]
    databaseHandlerMock.getAllSimpleVessels.mockResolvedValue(dbResult)
    await grpcController.getSimpleVessels(call, callback)

    const expectedRes: SimpleVesselsResponse = { vessels: dbResult }
    expect(callback).toHaveBeenCalledWith(null, expectedRes)
  })
})

describe('GRPCController - getMonitoredVessels', () => {
  it('should return invalid argument code if not at least 4 points in request (unclosed figure)', async () => {
    const call = mockDeep<grpc.ServerUnaryCall<MonitoredVesselsRequest, MonitoredVesselsResponse>>()
    const callback = jest.fn()
    call.request = { selectedArea: [{ lat: 12, lon: 21 }], timestamp: 21 }
    grpcController.getMonitoredVessels(call, callback)
    expect(callback).toHaveBeenCalledWith({ code: Status.INVALID_ARGUMENT }, null)
  })

  it('should return empty list if jobhandler returns empty list', async () => {
    const call = mockDeep<grpc.ServerUnaryCall<MonitoredVesselsRequest, MonitoredVesselsResponse>>()
    const callback = jest.fn()
    call.request = {
      selectedArea: [
        { lat: 12, lon: 21 },
        { lat: 12, lon: 21 },
        { lat: 12, lon: 21 },
        { lat: 12, lon: 21 },
      ],
      timestamp: 21,
    }
    jobHandlerMock.getMonitoredVessels.mockResolvedValue([])
    await grpcController.getMonitoredVessels(call, callback)
    expect(callback).toHaveBeenCalledWith(null, { vessels: [] })
  })

  it('should return list of monitored vessels if returned from jobhandler', async () => {
    const call = mockDeep<grpc.ServerUnaryCall<MonitoredVesselsRequest, MonitoredVesselsResponse>>()
    const callback = jest.fn()
    call.request = {
      selectedArea: [
        { lat: 12, lon: 21 },
        { lat: 12, lon: 21 },
        { lat: 12, lon: 21 },
        { lat: 12, lon: 21 },
      ],
      timestamp: 21,
    }
    const dbRes: MonitoredVessel[] = [
      {
        mmsi: 123,
        trustworthiness: 0.9,
        reason: 'because',
      },
      {
        mmsi: 123,
        trustworthiness: 1,
      },
    ]

    jobHandlerMock.getMonitoredVessels.mockResolvedValue(dbRes)
    await grpcController.getMonitoredVessels(call, callback)

    const expectedRes: MonitoredVesselsResponse = {
      vessels: dbRes,
    }
    expect(callback).toHaveBeenCalledWith(null, expectedRes)
  })
})
