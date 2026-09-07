CREATE TABLE IF NOT EXISTS supportTickets (
  id INT AUTO_INCREMENT NOT NULL,
  ticketId VARCHAR(20) NOT NULL,
  userId INT NULL,
  submittedByName VARCHAR(100) NULL,
  submittedByEmail VARCHAR(320) NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category ENUM('general','listing','trade','account','billing','bug','other') NOT NULL DEFAULT 'general',
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  adminNotes TEXT NULL,
  assignedAdminId INT NULL,
  resolvedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY supportTickets_ticketId_unique (ticketId),
  KEY supportTickets_userId_idx (userId),
  KEY supportTickets_status_idx (status),
  KEY supportTickets_createdAt_idx (createdAt)
);

CREATE TABLE IF NOT EXISTS supportTicketReplies (
  id INT AUTO_INCREMENT NOT NULL,
  ticketId INT NOT NULL,
  senderId INT NOT NULL,
  message TEXT NOT NULL,
  isAdminReply TINYINT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY supportTicketReplies_ticket_idx (ticketId),
  KEY supportTicketReplies_sender_idx (senderId)
);
