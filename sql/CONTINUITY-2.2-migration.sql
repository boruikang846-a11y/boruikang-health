-- Additive continuous care schema. No credentials, real patient data or destructive statements.
CREATE TABLE IF NOT EXISTS continuous_care_plan (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 disease_code VARCHAR(24) NOT NULL, consent_key VARCHAR(64) NOT NULL,
 status VARCHAR(24) NOT NULL,
 approval_status VARCHAR(24) NOT NULL,
 baseline VARCHAR(2000) NOT NULL,
 goals VARCHAR(2000) NOT NULL,
 patient_instructions VARCHAR(2000) NOT NULL,
 next_review_date DATE NOT NULL,
 revision INT NOT NULL,
 reviewer_id BIGINT,
 reviewed_at DATETIME,
 version INT NOT NULL,
 del_flag TINYINT NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id), KEY idx_continuous_care_plan (hospital_id,patient_id)
);

CREATE TABLE IF NOT EXISTS continuous_care_review (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 plan_id BIGINT NOT NULL,
 revision INT NOT NULL,
 kind VARCHAR(24) NOT NULL,
 summary TEXT NOT NULL,
 evidence VARCHAR(2000) NOT NULL,
 patient_message VARCHAR(2000) NOT NULL,
 assessment VARCHAR(24) NOT NULL,
 journey_id BIGINT,
 actor_id BIGINT NOT NULL,
 next_review_date DATE,
 del_flag TINYINT NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id), KEY idx_continuous_care_review (hospital_id,patient_id)
);

CREATE TABLE IF NOT EXISTS continuous_care_journey (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 plan_id BIGINT NOT NULL,
 journey_id BIGINT NOT NULL,
 del_flag TINYINT NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id), KEY idx_continuous_care_journey (hospital_id,patient_id), UNIQUE KEY uk_continuous_journey (plan_id,journey_id)
);

-- Apply once after PATIENT-SERVICE-2.1-migration.sql; existing data remains intact.
ALTER TABLE patient_service_feedback ADD COLUMN patient_reply VARCHAR(2000), ADD COLUMN replied_by BIGINT, ADD COLUMN replied_at DATETIME;

ALTER TABLE patient_service_entry ADD COLUMN service_consent_key VARCHAR(64);
