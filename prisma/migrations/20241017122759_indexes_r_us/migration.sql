-- CreateIndex
CREATE INDEX "zone_idx" ON "monitored_zone" USING GIST ("zone");

-- CreateIndex
CREATE INDEX "mmsi_idx" ON "vessel" USING HASH ("mmsi");

-- CreateIndex
CREATE INDEX "trajectory_idx" ON "vessel_trajectory" USING GIST ("trajectory");
