/*
  Warnings:

  - You are about to drop the `CallLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_callLogId_fkey";

-- DropTable
DROP TABLE "CallLog";

-- CreateTable
CREATE TABLE "call_logs" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "roomId" INTEGER,
    "roomNumber" TEXT NOT NULL,
    "phone" TEXT,
    "callType" TEXT NOT NULL DEFAULT 'SUPPORT',
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_logs_propertyId_idx" ON "call_logs"("propertyId");

-- CreateIndex
CREATE INDEX "call_logs_roomId_idx" ON "call_logs"("roomId");

-- CreateIndex
CREATE INDEX "call_logs_status_idx" ON "call_logs"("status");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_callLogId_fkey" FOREIGN KEY ("callLogId") REFERENCES "call_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
