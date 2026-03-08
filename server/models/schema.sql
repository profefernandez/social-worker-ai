-- MySQL schema for crisis-aware AI chatbot platform

CREATE DATABASE IF NOT EXISTS soicalworkerai;
USE soicalworkerai;

-- Therapist / admin accounts
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('therapist', 'admin') NOT NULL DEFAULT 'therapist',
  lemonade_api_key TEXT,
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
  lemonade_conversation_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Encrypted chat messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  sender ENUM('client', 'ai', 'social_worker_ai', 'admin') NOT NULL,
  content_encrypted TEXT NOT NULL,
  iv VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Crisis audit trail (session_id may be NULL for global/system-level entries)
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
  type ENUM('sms', 'call', 'email') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Migration: add agent tracking and expanded sender types
ALTER TABLE sessions ADD COLUMN active_agent_id VARCHAR(255) DEFAULT NULL;

ALTER TABLE messages MODIFY COLUMN sender ENUM('client', 'ai', 'social_worker_ai', 'admin') NOT NULL;

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

-- Expand sender types to include profe and kiddo_ai
ALTER TABLE messages MODIFY COLUMN sender ENUM('client', 'ai', 'kiddo_ai', 'social_worker_ai', 'profe', 'admin') NOT NULL;

-- Add sender_type for easier filtering
ALTER TABLE messages ADD COLUMN sender_type ENUM('user', 'kiddo_ai', 'profe', 'admin') DEFAULT 'user' AFTER sender;

-- Add urgency and summary to notifications for Profe notify_parent
ALTER TABLE notifications MODIFY COLUMN type ENUM('sms', 'call', 'email', 'profe_alert') NOT NULL;
ALTER TABLE notifications ADD COLUMN urgency ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low' AFTER type;
ALTER TABLE notifications ADD COLUMN summary TEXT AFTER urgency;
