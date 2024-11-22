-- CreateIndex
CREATE INDEX "ais_message_mmsi_timestamp_idx" ON "ais_message"("vessel_mmsi", "timestamp");
