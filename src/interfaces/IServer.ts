// Place functions that allows other components to start, stop and manipulate the server here

export default interface IServer {
  start(): void
  stop(): void
}
