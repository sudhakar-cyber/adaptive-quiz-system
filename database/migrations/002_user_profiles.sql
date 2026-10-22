-- Profile + credential columns so MySQL stays the single source of truth for
-- every dashboard (student roster, educator roster, admin user management).
ALTER TABLE users
  ADD COLUMN student_id VARCHAR(64) NULL,
  ADD COLUMN educator_id VARCHAR(64) NULL,
  ADD COLUMN top_subject VARCHAR(128) NULL,
  ADD COLUMN avatar_url TEXT NULL,
  ADD COLUMN country VARCHAR(96) NULL,
  ADD COLUMN streak INT NOT NULL DEFAULT 0,
  ADD COLUMN subject_mastery JSON NULL,
  ADD COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN last_reset_at TIMESTAMP NULL;

CREATE INDEX idx_users_student_id ON users (student_id);
CREATE INDEX idx_users_educator_id ON users (educator_id);
CREATE INDEX idx_users_role ON users (role);
