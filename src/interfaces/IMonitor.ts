// Place functions that allows other components to start, stop and manipulate the component monitor here

export default interface IMonitor {
  start(): void
  stop(): void
}
