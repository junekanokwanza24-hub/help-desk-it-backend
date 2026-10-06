/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `Tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';

-- DropForeignKey
ALTER TABLE "Tickets" DROP CONSTRAINT "Tickets_assignedToId_fkey";

-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "assignedToId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
