-- AlterTable
ALTER TABLE "demo_shipments" ADD COLUMN     "carrier" VARCHAR(50),
ADD COLUMN     "estimated_days" INTEGER,
ADD COLUMN     "label_url" VARCHAR(500),
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "parcel_details" JSONB,
ADD COLUMN     "service_name" VARCHAR(100),
ADD COLUMN     "stripe_payment_id" VARCHAR(100),
ADD COLUMN     "token_code" VARCHAR(20),
ADD COLUMN     "tracking_status" VARCHAR(50),
ADD COLUMN     "tracking_url" VARCHAR(500);

-- CreateTable
CREATE TABLE "demo_tokens" (
    "code" VARCHAR(20) NOT NULL,
    "customer_name" VARCHAR(100) NOT NULL,
    "customer_email" VARCHAR(100) NOT NULL,
    "customer_phone" VARCHAR(20),
    "max_shipments" INTEGER NOT NULL DEFAULT 10,
    "used_shipments" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_tokens_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" SERIAL NOT NULL,
    "shipment_id" INTEGER,
    "action_type" VARCHAR(50) NOT NULL,
    "details" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_logs_shipment_id_idx" ON "automation_logs"("shipment_id");

-- CreateIndex
CREATE INDEX "automation_logs_action_type_idx" ON "automation_logs"("action_type");

-- CreateIndex
CREATE INDEX "automation_logs_created_at_idx" ON "automation_logs"("created_at");

-- CreateIndex
CREATE INDEX "demo_shipments_token_code_idx" ON "demo_shipments"("token_code");

-- CreateIndex
CREATE INDEX "demo_shipments_status_idx" ON "demo_shipments"("status");

-- CreateIndex
CREATE INDEX "demo_shipments_tracking_number_idx" ON "demo_shipments"("tracking_number");

-- AddForeignKey
ALTER TABLE "demo_shipments" ADD CONSTRAINT "demo_shipments_token_code_fkey" FOREIGN KEY ("token_code") REFERENCES "demo_tokens"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "demo_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
