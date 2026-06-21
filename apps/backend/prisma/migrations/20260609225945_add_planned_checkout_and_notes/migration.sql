-- AlterTable
ALTER TABLE "stays" ADD COLUMN     "planned_check_out" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stay_notes" (
    "id" TEXT NOT NULL,
    "stay_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stay_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stay_notes" ADD CONSTRAINT "stay_notes_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "stays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_notes" ADD CONSTRAINT "stay_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
