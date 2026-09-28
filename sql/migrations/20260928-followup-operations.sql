USE bgssai_health;
-- Upgrade 1.2 once, before deploying 1.3; non-destructive, no DROP.
ALTER TABLE care_task
 ADD COLUMN followup_stage VARCHAR(24) DEFAULT NULL,
 ADD COLUMN next_contact_at DATETIME DEFAULT NULL,
 ADD COLUMN contact_result VARCHAR(24) DEFAULT NULL,
 ADD COLUMN identity_verified TINYINT(1) NOT NULL DEFAULT 0,
 ADD COLUMN handover_status VARCHAR(24) DEFAULT NULL,
 ADD COLUMN doctor_feedback VARCHAR(2000) DEFAULT NULL,
 ADD COLUMN acknowledged_at DATETIME DEFAULT NULL;
CREATE TABLE IF NOT EXISTS contact_attempt (
 id BIGINT NOT NULL AUTO_INCREMENT, hospital_id BIGINT NOT NULL, patient_id BIGINT NOT NULL, task_id BIGINT NOT NULL, actor_id BIGINT NOT NULL,
 contact_at DATETIME NOT NULL, method VARCHAR(20) NOT NULL, result VARCHAR(24) NOT NULL,
 identity_verified TINYINT(1) NOT NULL DEFAULT 0, report_reviewed TINYINT(1) NOT NULL DEFAULT 0, recipient_role VARCHAR(24) DEFAULT NULL,
 reason VARCHAR(1000) DEFAULT NULL, next_contact_at DATETIME DEFAULT NULL, next_plan VARCHAR(1000) DEFAULT NULL,
 medication_feedback VARCHAR(2000) DEFAULT NULL, patient_questions VARCHAR(2000) DEFAULT NULL, evidence VARCHAR(1000) NOT NULL,
 request_key VARCHAR(80) NOT NULL,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64) DEFAULT NULL, modifier VARCHAR(64) DEFAULT NULL,
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE KEY uk_contact_request(hospital_id,request_key), KEY idx_contact_task(hospital_id,task_id,contact_at)
);
CREATE TABLE IF NOT EXISTS operations_report (
 id BIGINT NOT NULL AUTO_INCREMENT, hospital_id BIGINT NOT NULL, owner_id BIGINT NOT NULL, report_type VARCHAR(16) NOT NULL,
 from_date DATE NOT NULL, to_date DATE NOT NULL, summary VARCHAR(2000) NOT NULL, action_plan VARCHAR(2000) NOT NULL, snapshot_json TEXT NOT NULL,
 delivery_evidence VARCHAR(1000) DEFAULT NULL, delivered_at DATETIME DEFAULT NULL, version INT NOT NULL DEFAULT 0,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64) DEFAULT NULL, modifier VARCHAR(64) DEFAULT NULL,
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), KEY idx_ops_report(hospital_id,owner_id,report_type,from_date)
);

UPDATE knowledge_entry SET kind='EDUCATION', status='DRAFT', reviewer_id=NULL, reviewed_at=NULL WHERE kind='SOP';
