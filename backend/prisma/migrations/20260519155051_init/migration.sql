-- CreateTable
CREATE TABLE "ExpectedPayment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "description" TEXT,

    CONSTRAINT "ExpectedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivedPayment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "narrative" TEXT,
    "senderName" TEXT,
    "senderAccount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationMatch" (
    "id" TEXT NOT NULL,
    "expectedPaymentId" TEXT NOT NULL,
    "receivedPaymentId" TEXT NOT NULL,
    "matchMethod" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "matchedRules" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "notes" TEXT,

    CONSTRAINT "ReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL,
    "ruleType" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "ReconciliationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpectedPayment_reference_key" ON "ExpectedPayment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivedPayment_reference_key" ON "ReceivedPayment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationMatch_expectedPaymentId_receivedPaymentId_key" ON "ReconciliationMatch"("expectedPaymentId", "receivedPaymentId");

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_expectedPaymentId_fkey" FOREIGN KEY ("expectedPaymentId") REFERENCES "ExpectedPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_receivedPaymentId_fkey" FOREIGN KEY ("receivedPaymentId") REFERENCES "ReceivedPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
