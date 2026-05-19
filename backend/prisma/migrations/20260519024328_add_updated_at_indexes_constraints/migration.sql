-- DropIndex
DROP INDEX "Property_ownerId_idx";

-- CreateIndex
CREATE INDEX "Task_assignedToId_status_idx" ON "Task"("assignedToId", "status");
