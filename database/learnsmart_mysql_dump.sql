-- LearnSmart MySQL Complete Data Dump
-- Generated to preserve all existing quizzes, questions, and attempts

CREATE DATABASE IF NOT EXISTS `learnsmart` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `learnsmart`;

-- LearnSmart MySQL Database Schema
-- Production Relational Schema for MySQL 5.7+ / 8.0+

CREATE DATABASE IF NOT EXISTS learnsmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE learnsmart;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student',
    department VARCHAR(128),
    phone VARCHAR(64),
    title VARCHAR(128),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL DEFAULT 'General',
    difficulty VARCHAR(32) NOT NULL DEFAULT 'Medium',
    duration VARCHAR(32) NOT NULL DEFAULT '15 mins',
    status VARCHAR(32) NOT NULL DEFAULT 'Draft',
    is_recommended TINYINT(1) NOT NULL DEFAULT 1,
    recommendation_reason VARCHAR(255),
    description TEXT,
    questions_count INT NOT NULL DEFAULT 0,
    submissions_count INT NOT NULL DEFAULT 0,
    avg_score DOUBLE NOT NULL DEFAULT 0.0,
    pass_rate DOUBLE NOT NULL DEFAULT 0.0,
    author_id VARCHAR(128),
    author_name VARCHAR(255),
    target_department VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quizzes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(128) PRIMARY KEY,
    quiz_id VARCHAR(128) NOT NULL,
    question_text TEXT NOT NULL,
    options_json JSON NOT NULL,
    correct_index INT NOT NULL DEFAULT 0,
    explanation TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_questions_quiz_id (quiz_id),
    CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(128) PRIMARY KEY,
    quiz_id VARCHAR(128) NOT NULL,
    quiz_title VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL DEFAULT 'General',
    student_id VARCHAR(128) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    score DOUBLE NOT NULL DEFAULT 0.0,
    total_questions INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'Completed',
    answers_json JSON,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attempts_quiz_id (quiz_id),
    INDEX idx_attempts_student_email (student_email),
    CONSTRAINT fk_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ================= DATA PRESERVATION INSERT STATEMENTS =================

INSERT INTO `users` (`id`, `name`, `email`, `role`, `department`, `is_active`) VALUES ('admin-system', 'System Administrator', 'admin@learnsmart.edu', 'admin', 'Administration', 1) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `users` (`id`, `name`, `email`, `role`, `department`, `is_active`) VALUES ('edu-201', 'Dr. Sarah Jenkins', 'educator@learnsmart.com', 'educator', 'Computer Science', 1) ON DUPLICATE KEY UPDATE `id`=`id`;



-- Dump completed successfully.
