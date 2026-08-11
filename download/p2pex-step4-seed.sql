-- P2PEX Database Setup - Step 4: Seed Data
-- Run this after Step 3
-- Admin login: kirubelmelesse840@gmail.com / kirubel2026

INSERT INTO "User" ("id", "userId", "username", "email", "name", "passwordHash", "kycVerified", "kycLevel", "kycStatus", "isAdmin", "fiatCurrency", "isActive", "isBanned", "createdAt", "updatedAt")
VALUES ('admin_000001', '000001', 'kirubel_melesse', 'kirubelmelesse840@gmail.com', 'Kirubel Melesse', 'd19077119d078b785bfe6e88e3a1ae5e:1453360669ea65140b68d08ea4223de27db1aa8d1a38162f70911679ed034a1c5c7f2eb609c733078cf6983aa4bf125a8a34fca4ff94ab40a90bdd446bb6a277', true, 2, 'APPROVED', true, 'ETB', true, false, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Wallet" ("id", "userId", "asset", "assetName", "balance", "available", "locked", "depositAddress", "createdAt", "updatedAt") VALUES
('w_btc',  'admin_000001', 'BTC',  'Bitcoin',   0.5,   0.5,   0, 'TADMINBTCADDRESS001',  NOW(), NOW()),
('w_eth',  'admin_000001', 'ETH',  'Ethereum',  8,     8,     0, 'TADMINETHADDRESS001',  NOW(), NOW()),
('w_usdt', 'admin_000001', 'USDT', 'Tether',    25000, 25000, 0, 'TADMINUSDTADDRESS001', NOW(), NOW()),
('w_usdc', 'admin_000001', 'USDC', 'USD Coin',  5000,  5000,  0, 'TADMINUSDCADDRESS001', NOW(), NOW()),
('w_bnb',  'admin_000001', 'BNB',  'BNB',       15,    15,    0, 'TADMINBNBADDRESS001',  NOW(), NOW()),
('w_sol',  'admin_000001', 'SOL',  'Solana',    80,    80,    0, 'TADMINSOLADDRESS001',  NOW(), NOW()),
('w_xrp',  'admin_000001', 'XRP',  'XRP',       3000,  3000,  0, 'TADMINXRPADDRESS001',  NOW(), NOW()),
('w_ada',  'admin_000001', 'ADA',  'Cardano',   5000,  5000,  0, 'TADMINADAADDRESS001',  NOW(), NOW()),
('w_doge', 'admin_000001', 'DOGE', 'Dogecoin',  30000, 30000, 0, 'TADMINDOGEADDRESS001', NOW(), NOW()),
('w_avax', 'admin_000001', 'AVAX', 'Avalanche', 60,    60,    0, 'TADMINAVAXADDRESS001', NOW(), NOW()),
('w_link', 'admin_000001', 'LINK', 'Chainlink', 150,   150,   0, 'TADMINLINKADDRESS001', NOW(), NOW()),
('w_dot',  'admin_000001', 'DOT',  'Polkadot',  500,   500,   0, 'TADMINDOTADDRESS001',  NOW(), NOW()),
('w_matic','admin_000001', 'MATIC','Polygon',   3000,  3000,  0, 'TADMINMATICADDRESS001',NOW(), NOW()),
('w_ltc',  'admin_000001', 'LTC',  'Litecoin',  30,    30,    0, 'TADMINLTCADDRESS001',  NOW(), NOW())
ON CONFLICT DO NOTHING;

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
('pair_ethbnb',   'ETHBNB',   'ETH',  'BNB',  'Ethereum', 'BNB',       5.9,    -0.8,  6.0,    5.8,    3000,  0, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "P2PListing" ("id", "userId", "asset", "fiatCurrency", "side", "price", "amount", "available", "minOrder", "maxOrder", "paymentMethods", "paymentDetails", "terms", "tradesCount", "rating", "status", "createdAt", "updatedAt") VALUES
('p2p_1', 'admin_000001', 'USDT', 'ETB', 'SELL', 128.50, 30000, 30000, 10, 3855000, '["Telebirr","CBE Birr","Awash Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"CBE Birr":{"account":"1000031904904","name":"Kirubel Melesse"},"Awash Bank":{"account":"0130456789012","name":"Kirubel Melesse"}}', 'Trade USDT for ETB via Telebirr, CBE Birr, Awash Bank.', 128, 4.9, 'ACTIVE', NOW(), NOW()),
('p2p_2', 'admin_000001', 'USDT', 'ETB', 'SELL', 129.00, 15000, 15000, 10, 1935000, '["Telebirr","Dashen Bank"]', '{"Telebirr":{"phone":"0912345678","name":"Kirubel"},"Dashen Bank":{"account":"5021456789012","name":"Kirubel Melesse"}}', 'Trade USDT for ETB via Telebirr, Dashen Bank.', 95, 4.8, 'ACTIVE', NOW(), NOW()),
('p2p_3', 'admin_000001', 'USDT', 'ETB', 'BUY',  127.00, 20000, 20000, 10, 2540000, '["Telebirr","CBE Birr","Coopbank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"CBE Birr":{"account":"1000031904904","name":"Kirubel Melesse"},"Coopbank":{"account":"2000456789012","name":"Kirubel Melesse"}}', 'Buying USDT with ETB.', 110, 4.9, 'ACTIVE', NOW(), NOW()),
('p2p_4', 'admin_000001', 'USDT', 'ETB', 'SELL', 128.75, 50000, 50000, 10, 6437500, '["Telebirr","Awash Bank","Hibret Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"Awash Bank":{"account":"0130456789012","name":"Kirubel Melesse"},"Hibret Bank":{"account":"0020456789012","name":"Kirubel Melesse"}}', 'Trade USDT for ETB.', 256, 5.0, 'ACTIVE', NOW(), NOW()),
('p2p_5', 'admin_000001', 'USDT', 'ETB', 'BUY',  126.50, 10000, 10000, 10, 1265000, '["Telebirr","Abay Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"Abay Bank":{"account":"0010456789012","name":"Kirubel Melesse"}}', 'Buying USDT with ETB.', 87, 4.7, 'ACTIVE', NOW(), NOW()),
('p2p_6', 'admin_000001', 'BTC',  'ETB', 'SELL', 8650000, 0.2, 0.2,  100, 1730000, '["Telebirr","CBE Birr"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"CBE Birr":{"account":"1000031904904","name":"Kirubel Melesse"}}', 'Trade BTC for ETB.', 45, 4.9, 'ACTIVE', NOW(), NOW()),
('p2p_7', 'admin_000001', 'ETH',  'ETB', 'SELL', 442000, 3, 3, 100, 1326000, '["Telebirr","Awash Bank"]', '{"Telebirr":{"phone":"0962404391","name":"Kirubel"},"Awash Bank":{"account":"0130456789012","name":"Kirubel Melesse"}}', 'Trade ETH for ETB.', 62, 4.8, 'ACTIVE', NOW(), NOW())
ON CONFLICT DO NOTHING;

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
