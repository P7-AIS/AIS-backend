# AIS-backend

## Prerequisites

- Install [Protobuf Compiler (protoc)](https://medium.com/@LogeshSakthivel/installing-protobuf-compiler-protoc-536e7770e13b)
- Install [Docker](https://docs.docker.com/get-started/get-docker/)

## Development

- `npm i`
- Copy `.env.example` to `.env` and fill out appropiate values
- Run `npx prisma generate` to create/update the prisma client class used in the code
- `git submodule update --init --recursive` to update submodules
- `npm run build:protos:(mac/win)` to generate TypeScript from .proto
- `npm run redis` to start Redis server
- `npm run dev`

## Prisma commands

- If connecting to new db run `npx prisma migrate deploy` to apply migration files
- If changes are made to `schema.prisma`
  - Run `npx prisma migrate dev --name "{...}"` to create and apply new migration file
  - Run `npx prisma generate` to create/update the prisma client class used in the code
