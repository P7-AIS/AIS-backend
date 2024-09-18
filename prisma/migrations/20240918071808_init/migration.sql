-- CreateTable
CREATE TABLE "ais_message" (
    "id" BIGSERIAL NOT NULL,
    "vessel_id" BIGINT NOT NULL,
    "destination_id" BIGINT,
    "mobile_type_id" BIGINT,
    "navigational_status_id" BIGINT,
    "data_source_type" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "latitude" DECIMAL NOT NULL,
    "longitude" DECIMAL NOT NULL,
    "rot" DECIMAL,
    "sog" DECIMAL,
    "cog" DECIMAL,
    "heading" INTEGER,
    "draught" DECIMAL,
    "cargo_type" TEXT,
    "eta" TIMESTAMP(6),

    CONSTRAINT "ais_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_type" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "mobile_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigational_status" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "navigational_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ship_type" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "ship_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vessel" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mmsi" BIGINT NOT NULL,
    "ship_type_id" BIGINT,
    "imo" BIGINT,
    "call_sign" TEXT,
    "flag" TEXT,
    "width" BIGINT,
    "length" BIGINT,
    "position_fixing_device" TEXT,
    "to_bow" BIGINT,
    "to_stern" BIGINT,
    "to_port" BIGINT,
    "to_starboard" BIGINT,

    CONSTRAINT "vessel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "ais_message_mobile_type_id_fk" FOREIGN KEY ("mobile_type_id") REFERENCES "mobile_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "ais_message_navigational_status_id_fk" FOREIGN KEY ("navigational_status_id") REFERENCES "navigational_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "fact_destination_id_fk" FOREIGN KEY ("destination_id") REFERENCES "destination"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "vessel_position_vessel_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "vessel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vessel" ADD CONSTRAINT "vessel_ship_type_fk" FOREIGN KEY ("ship_type_id") REFERENCES "ship_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
