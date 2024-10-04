# AIS-backend

## Development
- Copy `.env.example` to `.env` and fill out appropiate values
- If connecting to new db run `npx prisma migrate deploy` to apply migration files 
- If changes are made to `schema.prisma`
    - Run `npx prisma migrate dev --name "{...}"` to create and apply new migration file
    - Run `npx prisma generate` to create/update the prisma client class used in the code
- `git submodule update --init --recursive`
- `npm i`
- `npm run proto:build` to build protobuf files
- `npm run dev`
