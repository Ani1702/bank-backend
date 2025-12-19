-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "GoldTxType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "dob" TIMESTAMP(3),
    "panNumber" TEXT,
    "otpSecret" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "accountNo" TEXT,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "device" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "TxType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'SUCCESS',
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldHolding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalGrams" DOUBLE PRECISION NOT NULL DEFAULT 0.0000,
    "provider" TEXT NOT NULL DEFAULT 'SAFEGOLD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoldHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GoldTxType" NOT NULL,
    "amountINR" DECIMAL(10,2) NOT NULL,
    "goldWeight" DOUBLE PRECISION NOT NULL,
    "liveRate" DECIMAL(65,30) NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "providerRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "billerId" TEXT NOT NULL,
    "billerName" TEXT NOT NULL,
    "consumerNumber" TEXT NOT NULL,
    "billAmount" DECIMAL(10,2) NOT NULL,
    "billDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "transactionId" TEXT NOT NULL,
    "bbpsRefId" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'PROCESSING',
    "paymentMode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_accountNo_key" ON "User"("accountNo");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "GoldHolding_userId_key" ON "GoldHolding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BillPayment_transactionId_key" ON "BillPayment"("transactionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldHolding" ADD CONSTRAINT "GoldHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldTransaction" ADD CONSTRAINT "GoldTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
