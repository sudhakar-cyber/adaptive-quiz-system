-- LearnSmart Migration 001: cross-dashboard tracking
-- Adds the educator <-> student cohort link, persistent cross-role notifications,
-- and a platform activity log so the student, educator and admin dashboards all
-- read from and write to one connected source of truth (MySQL).

CREATE TABLE IF NOT EXISTS educator_students (
    educator_id VARCHAR(128) NOT NULL,
    student_id VARCHAR(128) NOT NULL,
    assigned_by VARCHAR(128),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (educator_id, student_id),
    INDEX idx_es_student (student_id),
    CONSTRAINT fk_es_educator FOREIGN KEY (educator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_es_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(128) PRIMARY KEY,
    recipient_id VARCHAR(128) NOT NULL,
    recipient_role VARCHAR(32) NOT NULL DEFAULT 'student',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    category VARCHAR(64) NOT NULL DEFAULT 'general',
    link VARCHAR(255),
    entity_type VARCHAR(64),
    entity_id VARCHAR(128),
    actor_id VARCHAR(128),
    actor_name VARCHAR(255),
    actor_role VARCHAR(32),
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_recipient (recipient_id, is_read, created_at),
    INDEX idx_notif_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id VARCHAR(128),
    actor_name VARCHAR(255),
    actor_role VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id VARCHAR(128),
    summary VARCHAR(500),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_created (created_at),
    INDEX idx_activity_actor (actor_id),
    INDEX idx_activity_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
