/*
  Warnings:

  - The values [NORMAL] on the enum `PriorityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PriorityType_new" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
ALTER TABLE "public"."Tickets" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Tickets" ALTER COLUMN "priority" TYPE "PriorityType_new" USING ("priority"::text::"PriorityType_new");
ALTER TYPE "PriorityType" RENAME TO "PriorityType_old";
ALTER TYPE "PriorityType_new" RENAME TO "PriorityType";
DROP TYPE "public"."PriorityType_old";
ALTER TABLE "Tickets" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
COMMIT;

-- AlterTable
ALTER TABLE "Tickets" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
