/*
  Warnings:

  - You are about to alter the column `price` on the `ServiceItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[propertyId,name,type]` on the table `ServiceCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[propertyId,categoryId,name]` on the table `ServiceItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[propertyId,roomNumber]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GuestSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ServiceCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ServiceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ServiceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SupportRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `call_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "GuestSession" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ServiceItem" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SupportRequest" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "call_logs" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_propertyId_idx" ON "Booking"("propertyId");

-- CreateIndex
CREATE INDEX "Booking_roomId_idx" ON "Booking"("roomId");

-- CreateIndex
CREATE INDEX "GuestSession_propertyId_idx" ON "GuestSession"("propertyId");

-- CreateIndex
CREATE INDEX "GuestSession_roomId_idx" ON "GuestSession"("roomId");

-- CreateIndex
CREATE INDEX "GuestSession_status_idx" ON "GuestSession"("status");

-- CreateIndex
CREATE INDEX "Order_propertyId_idx" ON "Order"("propertyId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_serviceItemId_idx" ON "OrderItem"("serviceItemId");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "ServiceCategory_propertyId_idx" ON "ServiceCategory"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_propertyId_name_type_key" ON "ServiceCategory"("propertyId", "name", "type");

-- CreateIndex
CREATE INDEX "ServiceItem_propertyId_idx" ON "ServiceItem"("propertyId");

-- CreateIndex
CREATE INDEX "ServiceItem_categoryId_idx" ON "ServiceItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_propertyId_categoryId_name_key" ON "ServiceItem"("propertyId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "ServiceRequest_propertyId_idx" ON "ServiceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "ServiceRequest_serviceItemId_idx" ON "ServiceRequest"("serviceItemId");

-- CreateIndex
CREATE INDEX "SupportRequest_propertyId_idx" ON "SupportRequest"("propertyId");

-- CreateIndex
CREATE INDEX "Task_propertyId_idx" ON "Task"("propertyId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_propertyId_status_idx" ON "Task"("propertyId", "status");

-- CreateIndex
CREATE INDEX "User_propertyId_idx" ON "User"("propertyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_propertyId_role_idx" ON "User"("propertyId", "role");

-- CreateIndex
CREATE INDEX "rooms_propertyId_idx" ON "rooms"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_propertyId_roomNumber_key" ON "rooms"("propertyId", "roomNumber");
