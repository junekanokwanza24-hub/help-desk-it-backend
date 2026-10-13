-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('SOFTWARE', 'HARDWARE');

-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "floor" TEXT,
ADD COLUMN     "type" "TicketType" NOT NULL DEFAULT 'SOFTWARE';
