-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "Building" INTEGER;

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "departmentName" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
