-- AlterTable
ALTER TABLE "demo_shipments" ADD COLUMN     "shippo_object_id" VARCHAR(100),
ADD COLUMN     "shippo_rate_id" VARCHAR(100),
ADD COLUMN     "shippo_rates" JSONB,
ADD COLUMN     "tracking_number" VARCHAR(100);
