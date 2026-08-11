-- P2PEX Database Setup - Step 2: Create Indexes
-- Run this after Step 1

CREATE UNIQUE INDEX IF NOT EXISTS "User_userId_key" ON "User"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "SupportMessage_userId_createdAt_idx" ON "SupportMessage"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_asset_key" ON "Wallet"("userId", "asset");
CREATE UNIQUE INDEX IF NOT EXISTS "TradingPair_symbol_key" ON "TradingPair"("symbol");
CREATE INDEX IF NOT EXISTS "TickerHistory_pairId_timestamp_idx" ON "TickerHistory"("pairId", "timestamp");
CREATE INDEX IF NOT EXISTS "Trade_pairId_createdAt_idx" ON "Trade"("pairId", "createdAt");
CREATE INDEX IF NOT EXISTS "P2PListing_asset_fiatCurrency_side_idx" ON "P2PListing"("asset", "fiatCurrency", "side");
CREATE INDEX IF NOT EXISTS "P2POrder_buyerId_idx" ON "P2POrder"("buyerId");
CREATE INDEX IF NOT EXISTS "P2POrder_sellerId_idx" ON "P2POrder"("sellerId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_asset_idx" ON "Transaction"("userId", "asset");
