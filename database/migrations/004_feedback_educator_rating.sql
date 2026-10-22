-- The student also rates the educator, so the feedback table keeps all three
-- star ratings of the compulsory feedback form.
ALTER TABLE quiz_feedback
  ADD COLUMN educator_rating INT NOT NULL DEFAULT 0;
