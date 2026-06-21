-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
