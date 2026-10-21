-- QR Attendance — the `qr_attendance` schema
--
-- Generated with:
--   mysqldump -u root --no-data --routines --triggers --skip-dump-date \
--     --no-tablespaces qr_attendance > db/schema.sql
--
-- This is a snapshot of the live database's structure, kept in the repo so the
-- schema is readable without a running MySQL. It is NOT the migration path:
-- db/migrations/ holds the ordered changes, and this file is regenerated after
-- each one. To build the database from nothing, run this file, then any
-- migration newer than it.
--
-- Three things in here that the API deliberately leans on:
--
--   * `recompute_id_status` and the three id_cards triggers derive
--     students.id_status; no PHP statement writes that column.
--   * The sections triggers refuse a strand on anything but Grades 11-12.
--   * v_students, v_attendance_sheet and v_device_today are what the reads
--     go through, rather than re-joining the roster in every query.

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_daily` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_year_id` smallint unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `session` enum('am','pm') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'am',
  `time_in` datetime DEFAULT NULL,
  `time_out` datetime DEFAULT NULL,
  `time_in_device_id` int unsigned DEFAULT NULL,
  `time_out_device_id` int unsigned DEFAULT NULL,
  `status` enum('present','late','absent') COLLATE utf8mb4_unicode_ci NOT NULL,
  `missing_time_out` tinyint(1) GENERATED ALWAYS AS (((`time_in` is not null) and (`time_out` is null))) VIRTUAL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_student_date_session` (`student_id`,`attendance_date`,`session`),
  KEY `idx_attendance_date_status` (`attendance_date`,`status`),
  KEY `idx_attendance_year` (`school_year_id`),
  KEY `fk_attendance_in_device` (`time_in_device_id`),
  KEY `fk_attendance_out_device` (`time_out_device_id`),
  CONSTRAINT `fk_attendance_in_device` FOREIGN KEY (`time_in_device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_out_device` FOREIGN KEY (`time_out_device_id`) REFERENCES `devices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_year` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`),
  CONSTRAINT `chk_attendance_absent` CHECK ((((`status` = _utf8mb4'absent') and (`time_in` is null) and (`time_out` is null)) or ((`status` <> _utf8mb4'absent') and (`time_in` is not null)))),
  CONSTRAINT `chk_attendance_order` CHECK (((`time_out` is null) or (`time_out` > `time_in`)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actor_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kind` enum('account','student','device','settings','security') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_occurred` (`occurred_at`),
  KEY `idx_audit_kind` (`kind`,`occurred_at`),
  KEY `idx_audit_actor` (`actor_id`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('online','offline','syncing') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'offline',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `current_operator_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pending_sync` int unsigned NOT NULL DEFAULT '0',
  `last_seen_at` datetime DEFAULT NULL,
  `paired_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_devices_code` (`code`),
  KEY `fk_devices_operator` (`current_operator_id`),
  CONSTRAINT `fk_devices_operator` FOREIGN KEY (`current_operator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `student_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_year_id` smallint unsigned NOT NULL,
  `section_id` int unsigned NOT NULL,
  `enrolled_on` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_enrollments_student_year` (`student_id`,`school_year_id`),
  KEY `idx_enrollments_section` (`section_id`,`school_year_id`),
  KEY `fk_enrollments_year` (`school_year_id`),
  CONSTRAINT `fk_enrollments_section` FOREIGN KEY (`section_id`, `school_year_id`) REFERENCES `sections` (`id`, `school_year_id`),
  CONSTRAINT `fk_enrollments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrollments_year` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grade_levels` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` tinyint unsigned NOT NULL,
  `is_senior_high` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_grade_levels_name` (`name`),
  UNIQUE KEY `uq_grade_levels_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `guardian_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` enum('time_in','time_out','absent') COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('queued','sent','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `error` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scan_event_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_status` (`status`,`created_at`),
  KEY `idx_notifications_student` (`student_id`),
  KEY `fk_notifications_scan` (`scan_event_id`),
  CONSTRAINT `fk_notifications_scan` FOREIGN KEY (`scan_event_id`) REFERENCES `scan_events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notifications_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `id_cards` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `student_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_content` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','revoked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `revoked_reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `issued_on` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `issued_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `printed_at` datetime DEFAULT NULL,
  `printer_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active_flag` tinyint GENERATED ALWAYS AS (if((`status` = _utf8mb4'active'),1,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_id_cards_qr` (`qr_content`),
  UNIQUE KEY `uq_id_cards_one_active_per_student` (`student_id`,`active_flag`),
  KEY `idx_id_cards_student_issued` (`student_id`,`issued_on`),
  KEY `fk_id_cards_issued_by` (`issued_by`),
  CONSTRAINT `fk_id_cards_issued_by` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_id_cards_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_id_cards_revoked_fields` CHECK ((((`status` = _utf8mb4'revoked') and (`revoked_at` is not null)) or ((`status` = _utf8mb4'active') and (`revoked_at` is null) and (`revoked_reason` is null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_id_cards_ai` AFTER INSERT ON `id_cards` FOR EACH ROW BEGIN
  CALL recompute_id_status(NEW.student_id);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_id_cards_au` AFTER UPDATE ON `id_cards` FOR EACH ROW BEGIN
  CALL recompute_id_status(NEW.student_id);
  IF OLD.student_id <> NEW.student_id THEN
    CALL recompute_id_status(OLD.student_id);
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_id_cards_ad` AFTER DELETE ON `id_cards` FOR EACH ROW BEGIN
  CALL recompute_id_status(OLD.student_id);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scan_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` int unsigned NOT NULL,
  `client_event_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_content` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_card_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direction` enum('in','out') COLLATE utf8mb4_unicode_ci NOT NULL,
  `outcome` enum('ok','late','invalid') COLLATE utf8mb4_unicode_ci NOT NULL,
  `invalid_reason` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scanned_at` datetime NOT NULL,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_scan_events_client` (`device_id`,`client_event_id`),
  KEY `idx_scan_events_scanned` (`scanned_at`),
  KEY `idx_scan_events_student` (`student_id`,`scanned_at`),
  KEY `fk_scan_events_operator` (`operator_id`),
  KEY `fk_scan_events_card` (`id_card_id`),
  CONSTRAINT `fk_scan_events_card` FOREIGN KEY (`id_card_id`) REFERENCES `id_cards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_scan_events_device` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `fk_scan_events_operator` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_scan_events_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_scan_events_invalid` CHECK (((`outcome` = _utf8mb4'invalid') = (`invalid_reason` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_settings` (
  `id` tinyint unsigned NOT NULL DEFAULT '1',
  `school_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gate_opens_at` time NOT NULL DEFAULT '06:00:00',
  `am_late_cutoff_at` time NOT NULL DEFAULT '07:20:00',
  `am_out_opens_at` time NOT NULL DEFAULT '11:30:00',
  `am_out_closes_at` time NOT NULL DEFAULT '12:30:00',
  `pm_in_opens_at` time NOT NULL DEFAULT '12:30:00',
  `pm_late_cutoff_at` time NOT NULL DEFAULT '13:30:00',
  `pm_out_opens_at` time NOT NULL DEFAULT '16:00:00',
  `gate_closes_at` time NOT NULL DEFAULT '18:00:00',
  `reject_revoked_cards` tinyint(1) NOT NULL DEFAULT '1',
  `require_time_out` tinyint(1) NOT NULL DEFAULT '1',
  `sms_on_time_in` tinyint(1) NOT NULL DEFAULT '1',
  `sms_on_absent` tinyint(1) NOT NULL DEFAULT '0',
  `updated_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_settings_updated_by` (`updated_by`),
  CONSTRAINT `fk_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_settings_gate_order` CHECK (((`gate_opens_at` < `am_late_cutoff_at`) and (`am_late_cutoff_at` < `am_out_opens_at`) and (`am_out_opens_at` < `am_out_closes_at`) and (`am_out_closes_at` <= `pm_in_opens_at`) and (`pm_in_opens_at` < `pm_late_cutoff_at`) and (`pm_late_cutoff_at` < `pm_out_opens_at`) and (`pm_out_opens_at` < `gate_closes_at`))),
  CONSTRAINT `chk_settings_single_row` CHECK ((`id` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_years` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(9) COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_on` date NOT NULL,
  `ends_on` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `closed_at` datetime DEFAULT NULL,
  `active_flag` tinyint GENERATED ALWAYS AS (if(`is_active`,1,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_school_years_label` (`label`),
  UNIQUE KEY `uq_school_years_one_active` (`active_flag`),
  CONSTRAINT `chk_school_years_dates` CHECK ((`starts_on` < `ends_on`)),
  CONSTRAINT `chk_school_years_label` CHECK (regexp_like(`label`,_utf8mb4'^[0-9]{4}-[0-9]{4}$'))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `school_year_id` smallint unsigned NOT NULL,
  `grade_level_id` tinyint unsigned NOT NULL,
  `strand_id` tinyint unsigned DEFAULT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adviser_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sections_year_grade_name` (`school_year_id`,`grade_level_id`,`name`),
  UNIQUE KEY `uq_sections_id_year` (`id`,`school_year_id`),
  KEY `idx_sections_grade` (`grade_level_id`),
  KEY `fk_sections_strand` (`strand_id`),
  CONSTRAINT `fk_sections_grade` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels` (`id`),
  CONSTRAINT `fk_sections_strand` FOREIGN KEY (`strand_id`) REFERENCES `strands` (`id`),
  CONSTRAINT `fk_sections_year` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`),
  CONSTRAINT `chk_sections_name` CHECK ((trim(`name`) <> _utf8mb4''))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_sections_bi` BEFORE INSERT ON `sections` FOR EACH ROW BEGIN
  IF NEW.strand_id IS NOT NULL AND NOT (
       SELECT is_senior_high FROM grade_levels WHERE id = NEW.grade_level_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Strand is only allowed on Grade 11 and 12 sections';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_sections_bu` BEFORE UPDATE ON `sections` FOR EACH ROW BEGIN
  IF NEW.strand_id IS NOT NULL AND NOT (
       SELECT is_senior_high FROM grade_levels WHERE id = NEW.grade_level_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Strand is only allowed on Grade 11 and 12 sections';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `strands` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_strands_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `lrn` char(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `suffix` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sex` enum('Male','Female') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_status` enum('printed','not-printed','reissue-needed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not-printed',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `guardian_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relationship` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registered_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registered_on` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_students_lrn` (`lrn`),
  KEY `idx_students_name` (`last_name`,`first_name`),
  KEY `idx_students_id_status` (`id_status`),
  KEY `fk_students_registered_by` (`registered_by`),
  CONSTRAINT `fk_students_registered_by` FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_students_contact` CHECK ((trim(`contact_number`) <> _utf8mb4'')),
  CONSTRAINT `chk_students_first_name` CHECK ((trim(`first_name`) <> _utf8mb4'')),
  CONSTRAINT `chk_students_guardian` CHECK ((trim(`guardian_name`) <> _utf8mb4'')),
  CONSTRAINT `chk_students_last_name` CHECK ((trim(`last_name`) <> _utf8mb4'')),
  CONSTRAINT `chk_students_lrn` CHECK (regexp_like(`lrn`,_utf8mb4'^[0-9]{12}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','registrar','scanner') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','disabled','invited') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'invited',
  `last_active_at` datetime DEFAULT NULL,
  `invited_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_status` (`role`,`status`),
  KEY `fk_users_invited_by` (`invited_by`),
  CONSTRAINT `fk_users_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_users_name` CHECK ((trim(`full_name`) <> _utf8mb4'')),
  CONSTRAINT `chk_users_password` CHECK (((`status` = _utf8mb4'invited') or (`password_hash` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_attendance_sheet` AS SELECT 
 1 AS `student_id`,
 1 AS `attendance_date`,
 1 AS `lrn`,
 1 AS `name`,
 1 AS `grade_level`,
 1 AS `section`,
 1 AS `am_in`,
 1 AS `am_out`,
 1 AS `pm_in`,
 1 AS `pm_out`,
 1 AS `am_status`,
 1 AS `pm_status`,
 1 AS `missing_time_out`,
 1 AS `gate`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_device_today` AS SELECT 
 1 AS `id`,
 1 AS `code`,
 1 AS `name`,
 1 AS `location`,
 1 AS `status`,
 1 AS `is_active`,
 1 AS `last_seen_at`,
 1 AS `pending_sync`,
 1 AS `operator`,
 1 AS `scans_today`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_students` AS SELECT 
 1 AS `id`,
 1 AS `lrn`,
 1 AS `last_name`,
 1 AS `first_name`,
 1 AS `middle_name`,
 1 AS `suffix`,
 1 AS `sex`,
 1 AS `grade_level`,
 1 AS `section`,
 1 AS `strand`,
 1 AS `id_status`,
 1 AS `active`,
 1 AS `guardian_name`,
 1 AS `relationship`,
 1 AS `contact_number`,
 1 AS `photo_path`,
 1 AS `registered_on`,
 1 AS `last_updated`,
 1 AS `registered_by_name`*/;
SET character_set_client = @saved_cs_client;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `recompute_id_status`(IN target CHAR(36))
BEGIN
  UPDATE students s
     SET s.id_status = CASE
       WHEN EXISTS (SELECT 1 FROM id_cards c
                     WHERE c.student_id = target AND c.status = 'active')
         THEN 'printed'
       WHEN EXISTS (SELECT 1 FROM id_cards c WHERE c.student_id = target)
         THEN 'reissue-needed'
       ELSE 'not-printed'
     END
   WHERE s.id = target;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50001 DROP VIEW IF EXISTS `v_attendance_sheet`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_attendance_sheet` AS select `a`.`student_id` AS `student_id`,`a`.`attendance_date` AS `attendance_date`,`s`.`lrn` AS `lrn`,concat(`s`.`last_name`,', ',`s`.`first_name`,if(((`s`.`middle_name` is null) or (`s`.`middle_name` = '')),'',concat(' ',left(`s`.`middle_name`,1),'.')),if(((`s`.`suffix` is null) or (`s`.`suffix` = '')),'',concat(' ',`s`.`suffix`))) AS `name`,`g`.`name` AS `grade_level`,`sec`.`name` AS `section`,max((case when (`a`.`session` = 'am') then `a`.`time_in` end)) AS `am_in`,max((case when (`a`.`session` = 'am') then `a`.`time_out` end)) AS `am_out`,max((case when (`a`.`session` = 'pm') then `a`.`time_in` end)) AS `pm_in`,max((case when (`a`.`session` = 'pm') then `a`.`time_out` end)) AS `pm_out`,max((case when (`a`.`session` = 'am') then `a`.`status` end)) AS `am_status`,max((case when (`a`.`session` = 'pm') then `a`.`status` end)) AS `pm_status`,max(`a`.`missing_time_out`) AS `missing_time_out`,max(`d`.`name`) AS `gate` from (((((`attendance_daily` `a` join `students` `s` on((`s`.`id` = `a`.`student_id`))) left join `enrollments` `e` on(((`e`.`student_id` = `a`.`student_id`) and (`e`.`school_year_id` = `a`.`school_year_id`)))) left join `sections` `sec` on((`sec`.`id` = `e`.`section_id`))) left join `grade_levels` `g` on((`g`.`id` = `sec`.`grade_level_id`))) left join `devices` `d` on((`d`.`id` = `a`.`time_in_device_id`))) group by `a`.`student_id`,`a`.`attendance_date`,`s`.`lrn`,`name`,`g`.`name`,`sec`.`name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_device_today`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_device_today` AS select `d`.`id` AS `id`,`d`.`code` AS `code`,`d`.`name` AS `name`,`d`.`location` AS `location`,`d`.`status` AS `status`,`d`.`is_active` AS `is_active`,`d`.`last_seen_at` AS `last_seen_at`,`d`.`pending_sync` AS `pending_sync`,`u`.`full_name` AS `operator`,(select count(0) from `scan_events` `se` where ((`se`.`device_id` = `d`.`id`) and (`se`.`scanned_at` >= curdate()) and (`se`.`scanned_at` < (curdate() + interval 1 day)))) AS `scans_today` from (`devices` `d` left join `users` `u` on((`u`.`id` = `d`.`current_operator_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_students`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_students` AS select `s`.`id` AS `id`,`s`.`lrn` AS `lrn`,`s`.`last_name` AS `last_name`,`s`.`first_name` AS `first_name`,`s`.`middle_name` AS `middle_name`,`s`.`suffix` AS `suffix`,`s`.`sex` AS `sex`,`g`.`name` AS `grade_level`,`sec`.`name` AS `section`,`st`.`code` AS `strand`,`s`.`id_status` AS `id_status`,`s`.`active` AS `active`,`s`.`guardian_name` AS `guardian_name`,`s`.`relationship` AS `relationship`,`s`.`contact_number` AS `contact_number`,`s`.`photo_path` AS `photo_path`,`s`.`registered_on` AS `registered_on`,`s`.`last_updated` AS `last_updated`,`u`.`full_name` AS `registered_by_name` from ((((((`students` `s` left join `school_years` `sy` on((0 <> `sy`.`is_active`))) left join `enrollments` `e` on(((`e`.`student_id` = `s`.`id`) and (`e`.`school_year_id` = `sy`.`id`)))) left join `sections` `sec` on((`sec`.`id` = `e`.`section_id`))) left join `grade_levels` `g` on((`g`.`id` = `sec`.`grade_level_id`))) left join `strands` `st` on((`st`.`id` = `sec`.`strand_id`))) left join `users` `u` on((`u`.`id` = `s`.`registered_by`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
