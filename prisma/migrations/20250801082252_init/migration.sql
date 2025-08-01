/*
  Warnings:

  - You are about to drop the column `userId` on the `fnb_orders` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "fnb_orders" DROP CONSTRAINT "fnb_orders_userId_fkey";

-- AlterTable
ALTER TABLE "fnb_orders" DROP COLUMN "userId";
