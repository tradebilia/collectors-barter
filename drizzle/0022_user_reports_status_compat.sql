ALTER TABLE userReports
  MODIFY COLUMN status ENUM('pending', 'reviewed', 'dismissed', 'action_taken', 'reviewing', 'resolved') NOT NULL DEFAULT 'pending';
