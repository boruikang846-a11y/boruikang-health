-- Patient service center: additive migration; no hospital credentials or patient seed data.
CREATE TABLE IF NOT EXISTS patient_service_entry (
 id BIGINT NOT NULL AUTO_INCREMENT, del_flag TINYINT NOT NULL DEFAULT 0,
 creator VARCHAR(64) DEFAULT NULL, modifier VARCHAR(64) DEFAULT NULL,
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 hospital_id BIGINT NOT NULL, contact_id BIGINT NOT NULL, token_hash VARCHAR(64) NOT NULL,
 status VARCHAR(24) NOT NULL, patient_name VARCHAR(80), phone VARCHAR(32), relation VARCHAR(16), entry_phase VARCHAR(16),
 consent_version VARCHAR(40), consent_at DATETIME, identity_evidence VARCHAR(1000), patient_id BIGINT,
 expires_at DATETIME NOT NULL, version INT NOT NULL DEFAULT 0,
 PRIMARY KEY(id), UNIQUE KEY uk_service_entry_token(token_hash), KEY idx_service_entry(hospital_id,status,contact_id)
);
CREATE TABLE IF NOT EXISTS patient_service_feedback (
 id BIGINT NOT NULL AUTO_INCREMENT, del_flag TINYINT NOT NULL DEFAULT 0,
 creator VARCHAR(64) DEFAULT NULL, modifier VARCHAR(64) DEFAULT NULL,
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 hospital_id BIGINT NOT NULL, entry_id BIGINT NOT NULL, patient_id BIGINT NOT NULL, journey_id BIGINT NOT NULL,
 case_id BIGINT NOT NULL, request_id VARCHAR(80) NOT NULL, kind VARCHAR(16) NOT NULL, content VARCHAR(2000) NOT NULL,
 payload_hash VARCHAR(64) NOT NULL,
 PRIMARY KEY(id), UNIQUE KEY uk_service_feedback_request(entry_id,request_id), KEY idx_service_feedback(hospital_id,patient_id,journey_id)
);
