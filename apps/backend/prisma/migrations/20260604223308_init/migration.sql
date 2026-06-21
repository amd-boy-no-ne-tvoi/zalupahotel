-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'employee', 'owner');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('adaptation', 'calm', 'active', 'needs_control');

-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('active', 'completed');

-- CreateEnum
CREATE TYPE "CageType" AS ENUM ('dog', 'cat', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "owner_id" TEXT NOT NULL,
    "photo_url" TEXT,
    "notes" TEXT,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cages" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "type" "CageType" NOT NULL,
    "is_occupied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stays" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "cage_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3),
    "status" "StayStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "stay_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "day_status" "DayStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_metrics" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "report_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_activities" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "report_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_observations" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "action" TEXT,
    "notify_owner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "report_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "cages_number_key" ON "cages"("number");

-- CreateIndex
CREATE UNIQUE INDEX "reports_stay_id_date_key" ON "reports"("stay_id", "date");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stays" ADD CONSTRAINT "stays_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stays" ADD CONSTRAINT "stays_cage_id_fkey" FOREIGN KEY ("cage_id") REFERENCES "cages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stays" ADD CONSTRAINT "stays_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "stays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_metrics" ADD CONSTRAINT "report_metrics_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_activities" ADD CONSTRAINT "report_activities_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_observations" ADD CONSTRAINT "report_observations_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
