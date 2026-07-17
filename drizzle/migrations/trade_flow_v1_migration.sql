-- ============================================================================
-- TRADE FLOW V1 — Database Migration Script
-- Date: July 16, 2026
-- Purpose: Expand tradeProposals table and create all new trade flow tables
-- Reference: TRADE_FLOW_DECISIONS.md (Decision 1) and FINAL_TRADE_FLOW_IMPLEMENTATION_BLUEPRINT.md
-- ============================================================================

-- ============================================================================
-- STEP 1: Expand the existing tradeProposals table
-- Per Decision 1: We expand tradeProposals, NOT create a new trades table.
-- ============================================================================

-- Add new status values by modifying the enum
ALTER TABLE tradeProposals
  MODIFY COLUMN status ENUM('pending','negotiating','accepted','shipped','completed','cancelled','disputed','declined') NOT NULL DEFAULT 'pending';

-- Add new columns for trade flow lifecycle
ALTER TABLE tradeProposals
  ADD COLUMN tradeReferenceNumber VARCHAR(20) UNIQUE AFTER status,
  ADD COLUMN negotiatingAt TIMESTAMP NULL AFTER tradeReferenceNumber,
  ADD COLUMN acceptedAt TIMESTAMP NULL AFTER negotiatingAt,
  ADD COLUMN shippedAt TIMESTAMP NULL AFTER acceptedAt,
  ADD COLUMN shippingDeadline TIMESTAMP NULL AFTER shippedAt,
  ADD COLUMN receiptDeadline TIMESTAMP NULL AFTER shippingDeadline,
  ADD COLUMN feedbackDeadline TIMESTAMP NULL AFTER receiptDeadline,
  ADD COLUMN lastActivityAt TIMESTAMP NULL AFTER feedbackDeadline,
  ADD COLUMN initiatorMessage TEXT NULL AFTER lastActivityAt,
  ADD COLUMN declineReason TEXT NULL AFTER initiatorMessage,
  ADD COLUMN cashFromRequester DECIMAL(12,2) NULL DEFAULT NULL AFTER declineReason,
  ADD COLUMN cashFromRecipient DECIMAL(12,2) NULL DEFAULT NULL AFTER cashFromRequester,
  ADD COLUMN middleManRequested TINYINT(1) DEFAULT 0 AFTER cashFromRecipient,
  ADD COLUMN middleManApproved TINYINT(1) DEFAULT 0 AFTER middleManRequested,
  ADD COLUMN middleManRequestedBy INT NULL AFTER middleManApproved;

-- Add index for trade reference number lookups
ALTER TABLE tradeProposals
  ADD INDEX idx_tradeReferenceNumber (tradeReferenceNumber),
  ADD INDEX idx_lastActivityAt (lastActivityAt);

-- ============================================================================
-- STEP 2: Expand tradeMessages table for message types
-- ============================================================================

ALTER TABLE tradeMessages
  ADD COLUMN messageType ENUM('regular','rejection','proposalUpdate','system','snapshot') DEFAULT 'regular' AFTER message,
  ADD COLUMN metadata TEXT NULL AFTER messageType;

-- ============================================================================
-- STEP 3: Expand tradeReviews table for 4-category ratings
-- Per Decision 5: Replace single rating with 4 sub-ratings
-- ============================================================================

ALTER TABLE tradeReviews
  ADD COLUMN tradeExperienceRating INT NULL AFTER rating,
  ADD COLUMN itemConditionRating INT NULL AFTER tradeExperienceRating,
  ADD COLUMN communicationRating INT NULL AFTER itemConditionRating,
  ADD COLUMN shippingSpeedRating INT NULL AFTER communicationRating,
  ADD COLUMN overallRating DECIMAL(2,1) NULL AFTER shippingSpeedRating,
  ADD COLUMN photos TEXT NULL AFTER review,
  ADD COLUMN isVisible TINYINT(1) DEFAULT 0 AFTER photos;

-- ============================================================================
-- STEP 4: Create tradeAlerts table
-- Per Decision 2: Separate trade alerts from messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradeAlerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  recipientUserId INT NOT NULL,
  alertType ENUM('initiated','declined','counterProposal','accepted','shipped','received','completed','cancelled','reminder','damaged') NOT NULL,
  message TEXT,
  isRead TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tradeAlerts_recipient (recipientUserId),
  INDEX idx_tradeAlerts_proposal (proposalId),
  INDEX idx_tradeAlerts_unread (recipientUserId, isRead),
  INDEX idx_tradeAlerts_createdAt (createdAt),

  CONSTRAINT fk_tradeAlerts_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id),
  CONSTRAINT fk_tradeAlerts_recipient FOREIGN KEY (recipientUserId) REFERENCES users(id)
);

-- ============================================================================
-- STEP 5: Create tradeTrackingNumbers table
-- For Stage 3: Shipping & Verification
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradeTrackingNumbers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  listingId INT NOT NULL,
  carrier ENUM('USPS','UPS','FedEx','DHL','Other') NOT NULL,
  carrierOther VARCHAR(100) NULL,
  trackingNumber VARCHAR(50) NOT NULL,
  trackingUrl VARCHAR(500) NULL,
  submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tradeTracking_proposal (proposalId),
  INDEX idx_tradeTracking_user (userId),

  CONSTRAINT fk_tradeTracking_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id),
  CONSTRAINT fk_tradeTracking_user FOREIGN KEY (userId) REFERENCES users(id),
  CONSTRAINT fk_tradeTracking_listing FOREIGN KEY (listingId) REFERENCES listings(id)
);

-- ============================================================================
-- STEP 6: Create tradeReceiptConfirmation table
-- For Stage 3: Both users must confirm receipt
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradeReceiptConfirmation (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  confirmationType ENUM('received','damaged') NOT NULL DEFAULT 'received',
  confirmedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_proposal_user (proposalId, userId),
  INDEX idx_tradeReceipt_proposal (proposalId),

  CONSTRAINT fk_tradeReceipt_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id),
  CONSTRAINT fk_tradeReceipt_user FOREIGN KEY (userId) REFERENCES users(id)
);

-- ============================================================================
-- STEP 7: Create tradeComplaints table
-- For dispute/complaint filings
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradeComplaints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  complaintUserId INT NOT NULL,
  description TEXT NOT NULL,
  complaintType ENUM('damaged','missing','notAsDescribed','other') NOT NULL,
  photos TEXT NULL,
  status ENUM('filed','resolved','dismissed') DEFAULT 'filed',
  adminNotes TEXT NULL,
  resolvedAt TIMESTAMP NULL,
  resolvedByAdminId INT NULL,
  resolution ENUM('completed','cancelled') NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tradeComplaints_proposal (proposalId),
  INDEX idx_tradeComplaints_status (status),

  CONSTRAINT fk_tradeComplaints_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id),
  CONSTRAINT fk_tradeComplaints_user FOREIGN KEY (complaintUserId) REFERENCES users(id)
);

-- ============================================================================
-- STEP 8: Create userRatingSummary table
-- Cached aggregated ratings per user for fast profile display
-- ============================================================================

CREATE TABLE IF NOT EXISTS userRatingSummary (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  totalTrades INT DEFAULT 0,
  avgTradeExperience DECIMAL(2,1) DEFAULT 0.0,
  avgItemCondition DECIMAL(2,1) DEFAULT 0.0,
  avgCommunication DECIMAL(2,1) DEFAULT 0.0,
  avgShippingSpeed DECIMAL(2,1) DEFAULT 0.0,
  avgOverallRating DECIMAL(2,1) DEFAULT 0.0,
  lastUpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_userRating_userId (userId),

  CONSTRAINT fk_userRating_user FOREIGN KEY (userId) REFERENCES users(id)
);

-- ============================================================================
-- STEP 9: Create tradeAdminLog table
-- For admin audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradeAdminLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  eventType ENUM('initiated','declined','negotiating','accepted','shipped','completed','cancelled','disputed','adminOverride') NOT NULL,
  actorUserId INT NULL,
  details TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tradeAdminLog_proposal (proposalId),
  INDEX idx_tradeAdminLog_event (eventType),
  INDEX idx_tradeAdminLog_createdAt (createdAt),

  CONSTRAINT fk_tradeAdminLog_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id)
);

-- ============================================================================
-- STEP 10: Create tradeVotingLinks table
-- For the community Trade Voting feature
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradeVotingLinks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  generatedByUserId INT NOT NULL,
  linkToken VARCHAR(64) NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tradeVoting_proposal (proposalId),
  INDEX idx_tradeVoting_token (linkToken),
  INDEX idx_tradeVoting_expires (expiresAt),

  CONSTRAINT fk_tradeVoting_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id),
  CONSTRAINT fk_tradeVoting_user FOREIGN KEY (generatedByUserId) REFERENCES users(id)
);

-- ============================================================================
-- STEP 11: Create tradeVotes table
-- For community votes on trade fairness
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradeVotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  votingLinkId INT NOT NULL,
  voterUserId INT NOT NULL,
  verdict ENUM('steal','fair','pass') NOT NULL,
  comment TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_voter_per_link (votingLinkId, voterUserId),
  INDEX idx_tradeVotes_link (votingLinkId),

  CONSTRAINT fk_tradeVotes_link FOREIGN KEY (votingLinkId) REFERENCES tradeVotingLinks(id),
  CONSTRAINT fk_tradeVotes_voter FOREIGN KEY (voterUserId) REFERENCES users(id)
);

-- ============================================================================
-- STEP 12: Create proposalReadStatus table
-- Tracks whether a user has read the current proposal
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposalReadStatus (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  lastReadAt TIMESTAMP NULL,
  isRead TINYINT(1) DEFAULT 0,

  UNIQUE KEY unique_proposal_user (proposalId, userId),
  INDEX idx_proposalRead_proposal (proposalId),

  CONSTRAINT fk_proposalRead_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id),
  CONSTRAINT fk_proposalRead_user FOREIGN KEY (userId) REFERENCES users(id)
);

-- ============================================================================
-- STEP 13: Create tradePrivateNotes table
-- For the "Private Notes" slide-drawer in the War Room
-- ============================================================================

CREATE TABLE IF NOT EXISTS tradePrivateNotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  noteContent TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_note_per_trade (proposalId, userId),
  INDEX idx_tradeNotes_proposal (proposalId),

  CONSTRAINT fk_tradeNotes_proposal FOREIGN KEY (proposalId) REFERENCES tradeProposals(id),
  CONSTRAINT fk_tradeNotes_user FOREIGN KEY (userId) REFERENCES users(id)
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
