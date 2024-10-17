/*
  Warnings:

  - You are about to drop the column `vessel_id` on the `ais_message` table. All the data in the column will be lost.
  - The primary key for the `vessel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `vessel` table. All the data in the column will be lost.
  - Added the required column `vessel_mmsi` to the `ais_message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ais_message" DROP CONSTRAINT "vessel_position_vessel_id_fk";

-- DropIndex
DROP INDEX "vessel_mmsi_key";

-- AlterTable
ALTER TABLE "ais_message" DROP COLUMN "vessel_id",
ADD COLUMN     "vessel_mmsi" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "vessel" DROP CONSTRAINT "vessel_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "vessel_pkey" PRIMARY KEY ("mmsi");

-- AddForeignKey
ALTER TABLE "ais_message" ADD CONSTRAINT "vessel_position_vessel_mmsi_fk" FOREIGN KEY ("vessel_mmsi") REFERENCES "vessel"("mmsi") ON DELETE NO ACTION ON UPDATE NO ACTION;
