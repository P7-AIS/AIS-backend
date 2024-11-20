# AIS-backend

## Prerequisites

- Install [Protobuf Compiler (protoc)](https://medium.com/@LogeshSakthivel/installing-protobuf-compiler-protoc-536e7770e13b)
- Install [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/)

## Development

- `npm i`
- Copy `.env.example` to `.env` and fill out appropiate values
- Run `npx prisma generate` to create/update the prisma client class used in the code
- `git submodule update --init --recursive` to update submodules
- `npm run build:protos:(mac/win)` to generate TypeScript from .proto
- `redis-server` in a new terminal (use WSL on Windows) to start Redis server
- `npm run dev`
- `docker compose up -d` to start prometheus server and grafana dashboard
- `npm run test` to run unit tests
- `npm run test:scalability` to run scalability test and generate report in logs folder
  - You need a proper cluster `config.yaml` file in `k8s` folder to run this test

## Prisma commands

- If connecting to new db run `npx prisma migrate deploy` to apply migration files
- If changes are made to `schema.prisma`
  - Run `npx prisma migrate dev --name "{...}"` to create and apply new migration file
  - Run `npx prisma generate` to create/update the prisma client class used in the code

## Redis commands

- `redis-server` in a new terminal (use WSL on Windows) to start Redis server
- `redis-cli` to connect to Redis instance
  - `shutdown` to stop instance
