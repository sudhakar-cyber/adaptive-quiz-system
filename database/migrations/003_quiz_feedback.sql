-- Quiz feedback is stored in MySQL so the educator dashboard reads the real
-- student feedback and the related notification survives a browser refresh.
CREATE TABLE IF NOT EXISTS quiz_feedback (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  quiz_id VARCHAR(128) NOT NULL,
  student_id VARCHAR(128) NULL,
  student_name VARCHAR(128) NULL,
  student_email VARCHAR(190) NULL,
  clarity_rating INT NOT NULL DEFAULT 0,
  difficulty_rating INT NOT NULL DEFAULT 0,
  comments TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_feedback_quiz ON quiz_feedback (quiz_id);
CREATE INDEX idx_quiz_feedback_student ON quiz_feedback (student_email);
