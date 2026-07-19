-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('APPOINTMENT_CREATED', 'APPOINTMENT_STATUS_CHANGED', 'APPOINTMENT_WEIGHT_CONFIRMED', 'APPOINTMENT_PAYMENT_UPDATED', 'APPOINTMENT_CANCELLED', 'USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT', 'SETTING_CHANGED', 'INVENTORY_UPDATED', 'INVENTORY_CREATED', 'INVENTORY_DELETED', 'BRANCH_CREATED', 'BRANCH_UPDATED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "googleId" TEXT,
    "image" TEXT NOT NULL DEFAULT '...',
    "address" JSONB NOT NULL DEFAULT '{}',
    "gender" TEXT NOT NULL DEFAULT 'Not Selected',
    "dob" TEXT NOT NULL DEFAULT 'Not Selected',
    "phone" TEXT NOT NULL DEFAULT '0000000000',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "speciality" TEXT[],
    "about" TEXT NOT NULL,
    "fees" INTEGER NOT NULL DEFAULT 0,
    "address" JSONB NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "slotsBooked" JSONB NOT NULL DEFAULT '{}',
    "date" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "branchData" JSONB NOT NULL,
    "userData" JSONB NOT NULL,
    "servicesTotal" DOUBLE PRECISION NOT NULL,
    "kgPrice" DOUBLE PRECISION NOT NULL,
    "addOnsTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promoCodeId" TEXT,
    "promoCode" TEXT,
    "discountType" TEXT,
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "actualKgPriceTotal" DOUBLE PRECISION,
    "actualTotalAmount" DOUBLE PRECISION,
    "actualVatAmount" DOUBLE PRECISION,
    "actualFinalAmount" DOUBLE PRECISION,
    "overweightChargeTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightConfirmedAt" TIMESTAMP(3),
    "weightConfirmedBy" TEXT,
    "preferredPaymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "paymentMethod" TEXT,
    "paymentPaidAt" TIMESTAMP(3),
    "payment" BOOLEAN NOT NULL DEFAULT false,
    "slotDate" TEXT NOT NULL,
    "slotTime" TEXT NOT NULL,
    "date" BIGINT NOT NULL,
    "pickupAddress" JSONB,
    "deliveryAddress" JSONB,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'pending_approval',
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "specialInstructions" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_services" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT,
    "price" DOUBLE PRECISION,
    "kg" DOUBLE PRECISION NOT NULL,
    "kgPrice" DOUBLE PRECISION,
    "actualKg" DOUBLE PRECISION,
    "actualKgPrice" DOUBLE PRECISION,
    "overweightCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_addons" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "appointment_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_clothing_types" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clothingTypeId" TEXT NOT NULL,

    CONSTRAINT "appointment_clothing_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor" JSONB NOT NULL,
    "target" JSONB,
    "branchId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "branches_email_key" ON "branches"("email");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_branchId_createdAt_idx" ON "audit_logs"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_addons" ADD CONSTRAINT "appointment_addons_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_clothing_types" ADD CONSTRAINT "appointment_clothing_types_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
