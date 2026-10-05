
-- JOURNEY-2.0: additive tables; no real patient seed data.
CREATE TABLE IF NOT EXISTS journey_command (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 journey_id BIGINT NOT NULL,
 request_id VARCHAR(80) NOT NULL,
 actor_id BIGINT NOT NULL,
 payload_hash VARCHAR(64) NOT NULL,
 response_json LONGTEXT NOT NULL,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE KEY uk_journey_command (hospital_id,request_id)
);
CREATE TABLE IF NOT EXISTS service_journey (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 kind VARCHAR(16) NOT NULL,
 entry_phase VARCHAR(16) NOT NULL,
 source_system VARCHAR(24) NOT NULL,
 event_key VARCHAR(120) NOT NULL,
 event_at DATETIME NOT NULL,
 status VARCHAR(20) NOT NULL,
 stage INT NOT NULL,
 owner_id BIGINT NOT NULL,
 doctor_id BIGINT NOT NULL,
 current_plan_id BIGINT,
 arrival_id BIGINT,
 record_id BIGINT,
 record_snapshot TEXT,
 identity_evidence VARCHAR(1000) NOT NULL,
 handoff_evidence VARCHAR(1000) NOT NULL,
 no_revisit TINYINT(1) NOT NULL DEFAULT 0,
 no_revisit_by BIGINT,
 no_revisit_reason VARCHAR(2000),
 version INT NOT NULL DEFAULT 0,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE KEY uk_journey_event (hospital_id,source_system,event_key), KEY idx_journey_patient (hospital_id,patient_id,status)
);
CREATE TABLE IF NOT EXISTS journey_result (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 journey_id BIGINT NOT NULL,
 request_id VARCHAR(80) NOT NULL,
 actor_id BIGINT NOT NULL,
 action VARCHAR(40) NOT NULL,
 step_code VARCHAR(30),
 evidence VARCHAR(4000) NOT NULL,
 occurred_at DATETIME NOT NULL,
 payload_hash VARCHAR(64) NOT NULL,
 response_json LONGTEXT,
 reference_id BIGINT,
 reference_type VARCHAR(30),
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE KEY uk_journey_request (hospital_id,request_id), KEY idx_journey_result (journey_id,id)
);
CREATE TABLE IF NOT EXISTS journey_plan (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 journey_id BIGINT NOT NULL,
 revision INT NOT NULL,
 status VARCHAR(20) NOT NULL,
 report_id BIGINT NOT NULL,
 report_snapshot TEXT NOT NULL,
 plan_text TEXT NOT NULL,
 nodes_json TEXT NOT NULL,
 template_id BIGINT,
 template_version INT,
 reviewer_id BIGINT,
 reviewed_at DATETIME,
 review_note VARCHAR(2000),
 baseline_at DATETIME NOT NULL,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE KEY uk_journey_plan_revision (journey_id,revision)
);
CREATE TABLE IF NOT EXISTS journey_task_link (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 journey_id BIGINT NOT NULL,
 plan_id BIGINT NOT NULL,
 seq INT NOT NULL,
 task_id BIGINT NOT NULL,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE KEY uk_journey_task (task_id), UNIQUE KEY uk_journey_plan_node (plan_id,seq)
);
CREATE TABLE IF NOT EXISTS journey_case (
 id BIGINT NOT NULL AUTO_INCREMENT,
 hospital_id BIGINT NOT NULL,
 patient_id BIGINT NOT NULL,
 journey_id BIGINT NOT NULL,
 kind VARCHAR(20) NOT NULL,
 status VARCHAR(20) NOT NULL,
 summary VARCHAR(2000) NOT NULL,
 due_at DATETIME NOT NULL,
 owner_id BIGINT NOT NULL,
 doctor_id BIGINT NOT NULL,
 resolution VARCHAR(2000),
 receipt_evidence VARCHAR(2000),
 version INT NOT NULL DEFAULT 0,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), KEY idx_journey_case (hospital_id,journey_id,status,due_at)
);

CREATE TABLE IF NOT EXISTS service_consent_withdrawal (
 id BIGINT NOT NULL AUTO_INCREMENT, hospital_id BIGINT NOT NULL, patient_id BIGINT NOT NULL,
 consent_key VARCHAR(64) NOT NULL, evidence VARCHAR(2000) NOT NULL, actor_id BIGINT NOT NULL,
 del_flag TINYINT(1) NOT NULL DEFAULT 0, creator VARCHAR(64), modifier VARCHAR(64),
 gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, gmt_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE KEY uk_service_consent_withdrawal (hospital_id,patient_id,consent_key)
);
