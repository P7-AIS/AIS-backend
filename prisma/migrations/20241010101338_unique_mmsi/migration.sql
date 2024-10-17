/*
  Warnings:

  - A unique constraint covering the columns `[mmsi]` on the table `vessel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "vessel_mmsi_key" ON "vessel"("mmsi");
