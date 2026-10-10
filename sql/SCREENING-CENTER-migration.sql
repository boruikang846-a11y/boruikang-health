-- Apply once to an existing database before deploying the screening center.
-- No legacy patient risk is converted into a report grade.
ALTER TABLE screening_record
 ADD COLUMN ecg_grade VARCHAR(16) DEFAULT NULL,
 ADD COLUMN ecg_scope VARCHAR(32) DEFAULT NULL,
 ADD COLUMN ecg_evidence VARCHAR(1000) DEFAULT NULL;
