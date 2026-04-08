ALTER TABLE `apartments`
  MODIFY COLUMN `status` ENUM('draft','pending_review','published','rejected','archived') NOT NULL DEFAULT 'draft';

UPDATE `apartments`
SET `status` = CASE `status`
  WHEN 'active' THEN 'published'
  WHEN 'pending' THEN 'pending_review'
  WHEN 'inactive' THEN 'archived'
  WHEN 'rented' THEN 'archived'
  ELSE 'draft'
END;
