-- CreateTable
CREATE TABLE "tracked_developers" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_developers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracked_developers_username_key" ON "tracked_developers"("username");

-- CreateIndex
CREATE INDEX "tracked_developers_username_idx" ON "tracked_developers"("username");
