-- Phase 3: sublease-specific fields for WeChat import
-- All three columns are nullable so existing rows are unaffected.

ALTER TABLE `apartments`
  ADD COLUMN `isSublease` boolean NULL AFTER `noCreditCheckRequired`,
  ADD COLUMN `subleaseEndDate` timestamp NULL AFTER `isSublease`,
  ADD COLUMN `wechatContact` varchar(100) NULL AFTER `subleaseEndDate`;
