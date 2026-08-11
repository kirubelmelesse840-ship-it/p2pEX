-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "twofaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycLevel" INTEGER NOT NULL DEFAULT 0,
    "kycStatus" TEXT NOT NULL DEFAULT 'NONE',
    "kycFullName" TEXT,
    "kycDateOfBirth" TEXT,
    "kycNationality" TEXT,
    "kycIdType" TEXT,
    "kycIdNumber" TEXT,
    "kycAddress" TEXT,
    "kycDocumentFront" TEXT,
    "kycDocumentBack" TEXT,
    "kycSubmittedAt" TIMESTAMP(3),
    "kycReviewedAt" TIMESTAMP(3),
    "kycRejectionReason" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "fiatCurrency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "imageData" TEXT,
    "voiceData" TEXT,
    "videoData" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingPair" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "baseAsset" TEXT NOT NULL,
    "quoteAsset" TEXT NOT NULL,
    "baseAssetName" TEXT NOT NULL,
    "quoteAssetName" TEXT NOT NULL,
    "lastPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceChangePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "high24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "low24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quoteVolume24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TickerHistory" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TickerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "filledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyOrderId" TEXT,
    "sellOrderId" TEXT,
    "makerSide" TEXT,
    "isMaker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P2PListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "available" DOUBLE PRECISION NOT NULL,
    "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "maxOrder" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "paymentMethods" TEXT NOT NULL,
    "paymentDetails" TEXT,
    "terms" TEXT,
    "tradesCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.9,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "P2PListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P2POrder" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentScreenshot" TEXT,
    "sellerPaymentMethod" TEXT,
    "sellerAccountNumber" TEXT,
    "sellerAccountName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "P2POrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "network" TEXT NOT NULL,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "txHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "requiredConfirmations" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_userId_createdAt_idx" ON "SupportMessage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_asset_key" ON "Wallet"("userId", "asset");

-- CreateIndex
CREATE UNIQUE INDEX "TradingPair_symbol_key" ON "TradingPair"("symbol");

-- CreateIndex
CREATE INDEX "TickerHistory_pairId_timestamp_idx" ON "TickerHistory"("pairId", "timestamp");

-- CreateIndex
CREATE INDEX "Trade_pairId_createdAt_idx" ON "Trade"("pairId", "createdAt");

-- CreateIndex
CREATE INDEX "P2PListing_asset_fiatCurrency_side_idx" ON "P2PListing"("asset", "fiatCurrency", "side");

-- CreateIndex
CREATE INDEX "P2POrder_buyerId_idx" ON "P2POrder"("buyerId");

-- CreateIndex
CREATE INDEX "P2POrder_sellerId_idx" ON "P2POrder"("sellerId");

-- CreateIndex
CREATE INDEX "Transaction_userId_asset_idx" ON "Transaction"("userId", "asset");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TickerHistory" ADD CONSTRAINT "TickerHistory_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "TradingPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "TradingPair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "TradingPair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PListing" ADD CONSTRAINT "P2PListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2POrder" ADD CONSTRAINT "P2POrder_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "P2PListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2POrder" ADD CONSTRAINT "P2POrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2POrder" ADD CONSTRAINT "P2POrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (email: kirubelmelesse840@gmail.com, password: kirubel2026)
INSERT INTO "User" ("id", "userId", "username", "email", "name", "passwordHash", "kycVerified", "kycLevel", "kycStatus", "isAdmin", "fiatCurrency", "isActive", "isBanned", "createdAt", "updatedAt")
VALUES ('admin_000001', '000001', 'kirubel_melesse', 'kirubelmelesse840@gmail.com', 'Kirubel Melesse', '85a7af17cac57363dfd4d3f523cb34b1:033e87ce1d0b90e2d3cdd0266462a5f6fbcfe5af23c363c9dc0148a6c27c5d798193d43c59b1db12f0c6bd2b448c3b3a8af6b49222119abd925ada94d87e70d0', true, 2, 'APPROVED', true, 'ETB', true, false, NOW(), NOW());

-- Admin wallets with balances
INSERT INTO "Wallet" ("id", "userId", "asset", "assetName", "balance", "available", "locked", "depositAddress", "createdAt", "updatedAt") VALUES
('w_btc',  'admin_000001', 'BTC',  'Bitcoin',   0.5,   0.5,   0, 'TADMINBTCADDRESS001', NOW(), NOW()),
('w_eth',  'admin_000001', 'ETH',  'Ethereum',  8,     8,     0, 'TADMINETHADDRESS001', NOW(), NOW()),
('w_usdt', 'admin_000001', 'USDT', 'Tether',    25000, 25000, 0, 'TADMINUSDTADDRESS001', NOW(), NOW()),
('w_usdc', 'admin_000001', 'USDC', 'USD Coin',  5000,  5000,  0, 'TADMINUSDCADDRESS001', NOW(), NOW()),
('w_bnb',  'admin_000001', 'BNB',  'BNB',       15,    15,    0, 'TADMINBNBADDRESS001', NOW(), NOW()),
('w_sol',  'admin_000001', 'SOL',  'Solana',    80,    80,    0, 'TADMINSOLADDRESS001', NOW(), NOW()),
('w_xrp',  'admin_000001', 'XRP',  'XRP',       3000,  3000,  0, 'TADMINXRPADDRESS001', NOW(), NOW()),
('w_ada',  'admin_000001', 'ADA',  'Cardano',   5000,  5000,  0, 'TADMINADAADDRESS001', NOW(), NOW()),
('w_doge', 'admin_000001', 'DOGE', 'Dogecoin',  30000, 30000, 0, 'TADMINDOGEADDRESS001', NOW(), NOW()),
('w_avax', 'admin_000001', 'AVAX', 'Avalanche', 60,    60,    0, 'TADMINAVAXADDRESS001', NOW(), NOW()),
('w_link', 'admin_000001', 'LINK', 'Chainlink', 150,   150,   0, 'TADMINLINKADDRESS001', NOW(), NOW()),
('w_dot',  'admin_000001', 'DOT',  'Polkadot',  500,   500,   0, 'TADMINDOTADDRESS001', NOW(), NOW()),
('w_matic','admin_000001', 'MATIC','Polygon',   3000,  3000,  0, 'TADMINMATICADDRESS001', NOW(), NOW()),
('w_ltc',  'admin_000001', 'LTC',  'Litecoin',  30,    30,    0, 'TADMINLTCADDRESS001', NOW(), NOW());

-- Trading pairs
INSERT INTO "TradingPair" ("id", "symbol", "baseAsset", "quoteAsset", "baseAssetName", "quoteAssetName", "lastPrice", "priceChangePercent", "high24h", "low24h", "volume24h", "quoteVolume24h", "isActive", "createdAt", "updatedAt") VALUES
('pair_btcusdt',  'BTCUSDT',  'BTC',  'USDT', 'Bitcoin',  'Tether',    67500,  2.5,   68200,  66800,  45000, 0, true, NOW(), NOW()),
('pair_ethusdt',  'ETHUSDT',  'ETH',  'USDT', 'Ethereum', 'Tether',    3450,   3.1,   3520,   3380,   38000, 0, true, NOW(), NOW()),
('pair_bnbusdt',  'BNBUSDT',  'BNB',  'USDT', 'BNB',      'Tether',    585,    -1.2,  595,    575,    12000, 0, true, NOW(), NOW()),
('pair_solusdt',  'SOLUSDT',  'SOL',  'USDT', 'Solana',   'Tether',    165,    4.5,   170,    158,    55000, 0, true, NOW(), NOW()),
('pair_xrpusdt',  'XRPUSDT',  'XRP',  'USDT', 'XRP',      'Tether',    0.62,   1.8,   0.65,   0.60,   80000, 0, true, NOW(), NOW()),
('pair_adausdt',  'ADAUSDT',  'ADA',  'USDT', 'Cardano',  'Tether',    0.45,   -0.5,  0.47,   0.43,   65000, 0, true, NOW(), NOW()),
('pair_dogeusdt', 'DOGEUSDT', 'DOGE', 'USDT', 'Dogecoin', 'Tether',    0.16,   5.2,   0.17,   0.15,   95000, 0, true, NOW(), NOW()),
('pair_avaxusdt', 'AVAXUSDT', 'AVAX', 'USDT', 'Avalanche','Tether',    38,     2.0,   39,     37,     22000, 0, true, NOW(), NOW()),
('pair_linkusdt', 'LINKUSDT', 'LINK', 'USDT', 'Chainlink','Tether',    18.5,   1.5,   19,     18,     18000, 0, true, NOW(), NOW()),
('pair_dotusdt',  'DOTUSDT',  'DOT',  'USDT', 'Polkadot', 'Tether',    7.2,    -2.1,  7.5,    7.0,    28000, 0, true, NOW(), NOW()),
('pair_maticusdt','MATICUSDT','MATIC','USDT', 'Polygon',  'Tether',    0.72,   3.8,   0.75,   0.70,   42000, 0, true, NOW(), NOW()),
('pair_ltcusdt',  'LTCUSDT',  'LTC',  'USDT', 'Litecoin', 'Tether',    85,     0.8,   87,     83,     15000, 0, true, NOW(), NOW()),
('pair_btcusdc',  'BTCUSDC',  'BTC',  'USDC', 'Bitcoin',  'USD Coin',  67500,  2.3,   68100,  66900,  12000, 0, true, NOW(), NOW()),
('pair_ethusdc',  'ETHUSDC',  'ETH',  'USDC', 'Ethereum', 'USD Coin',  3450,   3.0,   3510,   3390,   10000, 0, true, NOW(), NOW()),
('pair_btceth',   'BTCETH',   'BTC',  'ETH',  'Bitcoin',  'Ethereum',  19.5,   1.2,   20,     19,     5000,  0, true, NOW(), NOW()),
('pair_ethbnb',   'ETHBNB',   'ETH',  'BNB',  'Ethereum', 'BNB',       5.9,    -0.8,  6.0,    5.8,    3000,  0, true, NOW(), NOW());

-- P2P Listings (Ethiopian payment methods)
INSERT INTO "P2PListing" ("id", "userId", "asset", "fiatCurrency", "side", "price", "amount", "available", "minOrder", "maxOrder", "paymentMethods", "paymentDetails", "terms", "tradesCount", "rating", "status", "createdAt", "updatedAt") VALUES
('p2p_1', 'admin_000001', 'USDT', 'ETB', 'SELL', 128.50, 30000, 30000, 10, 3855000, '["Telebirr","CBE Birr","Awash Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"CBE Birr":{"account":"1000031904904","name":"Kirubel Melesse"},"Awash Bank":{"account":"0130456789012","name":"Kirubel Melesse"}}', 'Trade USDT for ETB via Telebirr, CBE Birr, Awash Bank.', 128, 4.9, 'ACTIVE', NOW(), NOW()),
('p2p_2', 'admin_000001', 'USDT', 'ETB', 'SELL', 129.00, 15000, 15000, 10, 1935000, '["Telebirr","Dashen Bank"]', '{"Telebirr":{"phone":"0912345678","name":"Kirubel"},"Dashen Bank":{"account":"5021456789012","name":"Kirubel Melesse"}}', 'Trade USDT for ETB via Telebirr, Dashen Bank.', 95, 4.8, 'ACTIVE', NOW(), NOW()),
('p2p_3', 'admin_000001', 'USDT', 'ETB', 'BUY',  127.00, 20000, 20000, 10, 2540000, '["Telebirr","CBE Birr","Coopbank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"CBE Birr":{"account":"1000031904904","name":"Kirubel Melesse"},"Coopbank":{"account":"2000456789012","name":"Kirubel Melesse"}}', 'Buying USDT with ETB.', 110, 4.9, 'ACTIVE', NOW(), NOW()),
('p2p_4', 'admin_000001', 'USDT', 'ETB', 'SELL', 128.75, 50000, 50000, 10, 6437500, '["Telebirr","Awash Bank","Hibret Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"Awash Bank":{"account":"0130456789012","name":"Kirubel Melesse"},"Hibret Bank":{"account":"0020456789012","name":"Kirubel Melesse"}}', 'Trade USDT for ETB.', 256, 5.0, 'ACTIVE', NOW(), NOW()),
('p2p_5', 'admin_000001', 'USDT', 'ETB', 'BUY',  126.50, 10000, 10000, 10, 1265000, '["Telebirr","Abay Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"Abay Bank":{"account":"0010456789012","name":"Kirubel Melesse"}}', 'Buying USDT with ETB.', 87, 4.7, 'ACTIVE', NOW(), NOW()),
('p2p_6', 'admin_000001', 'BTC',  'ETB', 'SELL', 8650000, 0.2, 0.2,  100, 1730000, '["Telebirr","CBE Birr"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"CBE Birr":{"account":"1000031904904","name":"Kirubel Melesse"}}', 'Trade BTC for ETB.', 45, 4.9, 'ACTIVE', NOW(), NOW()),
('p2p_7', 'admin_000001', 'ETH',  'ETB', 'SELL', 442000, 3, 3, 100, 1326000, '["Telebirr","Awash Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"Awash Bank":{"account":"0130456789012","name":"Kirubel Melesse"}}', 'Trade ETH for ETB.', 62, 4.8, 'ACTIVE', NOW(), NOW());

-- Default system settings
INSERT INTO "Setting" ("key", "value", "updatedAt") VALUES
('maintenanceMode', 'false', NOW()),
('marketPaused', 'false', NOW()),
('spotFeePercent', '0.1', NOW()),
('p2pFeePercent', '0.0', NOW()),
('withdrawFeeMultiplier', '1.0', NOW()),
('minKycLevel', '0', NOW()),
('maxDailyWithdrawUsd', '10000', NOW()),
('supportEmail', 'support@p2pex.com', NOW()),
('announcement', 'Welcome to P2PEX — trade securely with confidence!', NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- Sample completed deposit transactions for admin
INSERT INTO "Transaction" ("id", "userId", "asset", "type", "amount", "fee", "network", "fromAddress", "txHash", "status", "confirmations", "requiredConfirmations", "note", "createdAt", "updatedAt") VALUES
('tx_1', 'admin_000001', 'USDT', 'DEPOSIT', 25000, 0, 'TRC20', 'T9kRrY3pKsQmFzN2vBqXwL8jH4tGc', '0xabc123def456789012345678901234567890123456789012345678901234abcd', 'COMPLETED', 12, 1, 'Initial USDT deposit', NOW() - INTERVAL '30 days', NOW()),
('tx_2', 'admin_000001', 'BTC',  'DEPOSIT', 0.5,   0, 'BTC',   '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', '0xdef456abc123456789012345678901234567890123456789012345678901abcd', 'COMPLETED', 3, 3, 'Initial BTC deposit', NOW() - INTERVAL '25 days', NOW()),
('tx_3', 'admin_000001', 'ETH',  'DEPOSIT', 8,     0, 'ERC20', '0x742d35Cc6634C0532925a3b844Bc454e4438d44E', '0x123abc456def789012345678901234567890123456789012345678901234abcd', 'COMPLETED', 12, 12, 'Initial ETH deposit', NOW() - INTERVAL '20 days', NOW());

-- ============================================================
-- DONE! Admin login:
-- Email: kirubelmelesse840@gmail.com
-- Password: kirubel2026
-- ============================================================
