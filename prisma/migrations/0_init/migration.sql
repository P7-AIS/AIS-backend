-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis" WITH VERSION "3.2.0";

-- CreateTable
CREATE TABLE "ais_message" (
    "id" SERIAL NOT NULL,
    "vessel_mmsi" BIGINT NOT NULL,
    "destination" TEXT,
    "mobile_type_id" INTEGER,
    "nav_status_id" INTEGER,
    "data_source_type" TEXT,
    "timestamp" TIMESTAMP(6) NOT NULL,
    "cog" REAL,
    "rot" REAL,
    "sog" REAL,
    "coordm" geometry(PointM,4326),
    "heading" REAL,
    "draught" REAL,
    "cargo_type" TEXT,
    "eta" TIMESTAMP(6),
    "traj_id" BIGINT,

    CONSTRAINT "ais_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mid" (
    "id" SMALLINT NOT NULL,
    "country" TEXT NOT NULL,
    "country_short" CHAR(3)[],

    CONSTRAINT "mid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "mobile_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_zone" (
    "id" SERIAL NOT NULL,
    "created_at" TIME(6) NOT NULL,
    "zone" geometry(Polygon,4326) NOT NULL,

    CONSTRAINT "monitored_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nav_status" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "nav_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ship_type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ship_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vessel" (
    "name" TEXT,
    "mmsi" BIGINT NOT NULL,
    "ship_type_id" INTEGER,
    "imo" INTEGER,
    "call_sign" TEXT,
    "width" INTEGER,
    "length" INTEGER,
    "position_fixing_device" TEXT,
    "to_bow" INTEGER,
    "to_stern" INTEGER,
    "to_port" INTEGER,
    "to_starboard" INTEGER,
    "country_id" SMALLINT,

    CONSTRAINT "vessel_pkey" PRIMARY KEY ("mmsi")
);

-- CreateTable
CREATE TABLE "vessel_trajectory" (
    "mmsi" BIGSERIAL NOT NULL,
    "trajectory" geometry(LineStringM,4326) NOT NULL,

    CONSTRAINT "vessel_trajectory_pkey" PRIMARY KEY ("mmsi")
);

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "ais_message_mobile_type_id_fkey" FOREIGN KEY ("mobile_type_id") REFERENCES "mobile_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "ais_message_nav_status_id_fkey" FOREIGN KEY ("nav_status_id") REFERENCES "nav_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "ais_message_traj_id_fkey" FOREIGN KEY ("traj_id") REFERENCES "vessel_trajectory"("mmsi") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "ais_message_vessel_mmsi_fkey" FOREIGN KEY ("vessel_mmsi") REFERENCES "vessel"("mmsi") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vessel" ADD CONSTRAINT "vessel_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "mid"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vessel" ADD CONSTRAINT "vessel_ship_type_id_fkey" FOREIGN KEY ("ship_type_id") REFERENCES "ship_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vessel_trajectory" ADD CONSTRAINT "vessel_id" FOREIGN KEY ("mmsi") REFERENCES "vessel"("mmsi") ON DELETE NO ACTION ON UPDATE NO ACTION;

