-- MySQL schema for 60 Watts of Intelligence platform
-- Run this on a fresh database. For existing databases, see migration notes below.

-- Therapist / admin accounts
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('therapist', 'admin') NOT NULL DEFAULT 'therapist',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  client_identifier VARCHAR(255),
  crisis_active TINYINT(1) DEFAULT 0,
  crisis_activated_at TIMESTAMP NULL,
  active_agent_id VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Encrypted chat messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  sender ENUM('client', 'ai', 'kiddo_ai', 'social_worker_ai', 'profe', 'admin') NOT NULL,
  sender_type ENUM('user', 'kiddo_ai', 'profe', 'admin') DEFAULT 'user',
  content_encrypted TEXT NOT NULL,
  iv VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Audit trail (session_id may be NULL for global/system-level entries)
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36),
  actor VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  detail TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification log
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  type ENUM('sms', 'call', 'email', 'profe_alert') NOT NULL,
  urgency ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
  summary TEXT,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Profe AI observation log (check_ai_response + log_observation data)
CREATE TABLE IF NOT EXISTS profe_observations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  observation_type ENUM(
    'check_ai_response',
    'log_observation',
    'emotional_dependency',
    'ai_behavior',
    'critical_thinking',
    'ai_literacy',
    'boundary_issue',
    'positive_interaction',
    'concerning_pattern'
  ) NOT NULL,
  description TEXT,
  sentiment ENUM('positive', 'neutral', 'concerned', 'critical') DEFAULT 'neutral',
  ai_literacy_level ENUM('none', 'basic', 'intermediate', 'advanced') DEFAULT NULL,
  safety_rating INT UNSIGNED DEFAULT NULL COMMENT '0-100 scale',
  sycophancy_score INT UNSIGNED DEFAULT NULL COMMENT '0-100 scale',
  age_appropriate TINYINT(1) DEFAULT NULL,
  manipulation_detected TINYINT(1) DEFAULT NULL,
  recommended_action VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_type (observation_type),
  INDEX idx_created (created_at),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
