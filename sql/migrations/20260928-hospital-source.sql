-- MySQL 8: run ONCE only on an existing HEALTH-MVP-1.1 schema, before the 1.2 application.
-- Fresh databases already contain these columns in DDL.sql. Inspect columns before running.
USE bgssai_health;
ALTER TABLE patient
 ADD COLUMN source_system VARCHAR(24) NOT NULL DEFAULT 'MANUAL',
 ADD COLUMN hospital_patient_id VARCHAR(120) DEFAULT NULL,
 ADD UNIQUE KEY uk_patient_source (hospital_id, source_system, hospital_patient_id);
