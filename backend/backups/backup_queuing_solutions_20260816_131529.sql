-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: queuing_solutions
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts_otpverification`
--

DROP TABLE IF EXISTS `accounts_otpverification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts_otpverification` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `phone` longtext DEFAULT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `purpose` varchar(20) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `attempts` int(11) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_otpverification`
--

LOCK TABLES `accounts_otpverification` WRITE;
/*!40000 ALTER TABLE `accounts_otpverification` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts_otpverification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts_user`
--

DROP TABLE IF EXISTS `accounts_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts_user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `email` varchar(254) NOT NULL,
  `phone` longtext DEFAULT NULL,
  `role` varchar(20) NOT NULL,
  `is_2fa_enabled` tinyint(1) NOT NULL,
  `branch_id` bigint(20) DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `accounts_user_branch_id_38ec6caf_fk_branches_branch_id` (`branch_id`),
  KEY `accounts_user_company_id_bc91fe74_fk_companies_company_id` (`company_id`),
  CONSTRAINT `accounts_user_branch_id_38ec6caf_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `accounts_user_company_id_bc91fe74_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_user`
--

LOCK TABLES `accounts_user` WRITE;
/*!40000 ALTER TABLE `accounts_user` DISABLE KEYS */;
INSERT INTO `accounts_user` VALUES (1,'pbkdf2_sha256$1000000$ZSfQzKhLCkbTWl4QptArIi$WXryXBWaIWDU9DjdLtjIY8oZD5ndjKkI5ypkKfymOvw=',NULL,1,'Devika','Raman',1,1,'2026-08-16 06:53:57.723231','superadmin@quesole.com',NULL,'super_admin',0,NULL,NULL),(2,'pbkdf2_sha256$1000000$ACdZlUV252jVXYpQIlSTgB$TfS334jpGmAfLY1Ok6Cut3hdaBarXbKHSoutO15JIgo=',NULL,0,'Rhea','Mehta',0,1,'2026-08-16 06:53:58.504775','rhea.mehta@apollocare.in',NULL,'company_admin',0,NULL,1),(3,'pbkdf2_sha256$1000000$vzPTS1Gc9JbRJN6NR93HCC$8k5IveNcwwDxlv6F5YA8IuGiunWWb+orJ7o5gfZz42Q=',NULL,0,'Devansh','Patel',0,1,'2026-08-16 06:53:59.206031','devansh.p@apollocare.in',NULL,'branch_admin',0,1,1),(4,'pbkdf2_sha256$1000000$XxMTCuOjMnfgXURvyGx2i7$0jJ8z39c8bEV3DCv7tGUwjbf/4u/86dJbqRmJcSGiAg=',NULL,0,'Kavya','Trivedi',0,1,'2026-08-16 06:53:59.898693','kavya.t@apollocare.in',NULL,'desk_staff',0,1,1),(5,'pbkdf2_sha256$1000000$Ac0Lq8d7QE82ac8R9tO0wY$xo20hT4irrU+dTPs+cGX8dIKGEUAtkljx+5Maco1kLY=',NULL,0,'John','Doe',0,1,'2026-08-16 06:54:00.910668','john.doe@star.in',NULL,'company_admin',0,NULL,2),(6,'pbkdf2_sha256$1000000$9dMEGBjktbE1GycLuvlLaJ$rZE6bBV04TI/MJTncdtGHBwhkY8mYqJYYg8k/jXwGiY=',NULL,0,'Sam','Smith',0,1,'2026-08-16 06:54:01.757487','sam.smith@star.in',NULL,'branch_admin',0,3,2),(7,'pbkdf2_sha256$1000000$VGfYQvDB9n2jKYP4xn06tB$N7nJ8rwh/XGHMEgpv+IydltRwBv9DCLcxfL7o3xN0Hc=',NULL,0,'Lucy','L',0,1,'2026-08-16 06:54:02.553303','lucy.l@star.in',NULL,'desk_staff',0,3,2);
/*!40000 ALTER TABLE `accounts_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts_user_groups`
--

DROP TABLE IF EXISTS `accounts_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts_user_groups` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `group_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_user_groups_user_id_group_id_59c0b32f_uniq` (`user_id`,`group_id`),
  KEY `accounts_user_groups_group_id_bd11a704_fk_auth_group_id` (`group_id`),
  CONSTRAINT `accounts_user_groups_group_id_bd11a704_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `accounts_user_groups_user_id_52b62117_fk_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_user_groups`
--

LOCK TABLES `accounts_user_groups` WRITE;
/*!40000 ALTER TABLE `accounts_user_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts_user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts_user_user_permissions`
--

DROP TABLE IF EXISTS `accounts_user_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts_user_user_permissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq` (`user_id`,`permission_id`),
  KEY `accounts_user_user_p_permission_id_113bb443_fk_auth_perm` (`permission_id`),
  CONSTRAINT `accounts_user_user_p_permission_id_113bb443_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `accounts_user_user_p_user_id_e4f0a161_fk_accounts_` FOREIGN KEY (`user_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_user_user_permissions`
--

LOCK TABLES `accounts_user_user_permissions` WRITE;
/*!40000 ALTER TABLE `accounts_user_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts_user_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts_userinvite`
--

DROP TABLE IF EXISTS `accounts_userinvite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts_userinvite` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `email_or_phone` longtext NOT NULL,
  `role` varchar(20) NOT NULL,
  `token` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `accounts_userinvite_company_id_53b57654_fk_companies_company_id` (`company_id`),
  CONSTRAINT `accounts_userinvite_company_id_53b57654_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts_userinvite`
--

LOCK TABLES `accounts_userinvite` WRITE;
/*!40000 ALTER TABLE `accounts_userinvite` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts_userinvite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analytics_reportsnapshot`
--

DROP TABLE IF EXISTS `analytics_reportsnapshot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analytics_reportsnapshot` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `report_date` date NOT NULL,
  `metrics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`metrics`)),
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `analytics_reportsnap_branch_id_24eceb22_fk_branches_` (`branch_id`),
  KEY `analytics_reportsnap_company_id_3cc86b64_fk_companies` (`company_id`),
  CONSTRAINT `analytics_reportsnap_branch_id_24eceb22_fk_branches_` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `analytics_reportsnap_company_id_3cc86b64_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analytics_reportsnapshot`
--

LOCK TABLES `analytics_reportsnapshot` WRITE;
/*!40000 ALTER TABLE `analytics_reportsnapshot` DISABLE KEYS */;
/*!40000 ALTER TABLE `analytics_reportsnapshot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appointments_appointment`
--

DROP TABLE IF EXISTS `appointments_appointment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appointments_appointment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` longtext NOT NULL,
  `slot_start` datetime(6) NOT NULL,
  `slot_end` datetime(6) NOT NULL,
  `status` varchar(20) NOT NULL,
  `manage_code` varchar(50) NOT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `service_id` bigint(20) NOT NULL,
  `customer_consented_at` datetime(6) DEFAULT NULL,
  `customer_phone_index` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `manage_code` (`manage_code`),
  KEY `appointments_appoint_branch_id_f24c15a7_fk_branches_` (`branch_id`),
  KEY `appointments_appoint_company_id_ef4f3902_fk_companies` (`company_id`),
  KEY `appointments_appoint_service_id_945bc869_fk_queuing_s` (`service_id`),
  KEY `appointments_appointment_customer_phone_index_4e0b2d3c` (`customer_phone_index`),
  CONSTRAINT `appointments_appoint_branch_id_f24c15a7_fk_branches_` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `appointments_appoint_company_id_ef4f3902_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `appointments_appoint_service_id_945bc869_fk_queuing_s` FOREIGN KEY (`service_id`) REFERENCES `queuing_service` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments_appointment`
--

LOCK TABLES `appointments_appointment` WRITE;
/*!40000 ALTER TABLE `appointments_appointment` DISABLE KEYS */;
INSERT INTO `appointments_appointment` VALUES (1,'2026-08-16 12:33:51.942254','2026-08-16 12:33:51.942296','Seeded Appt User','gAAAAABqga4vFy2b5BDfq-ylkY5akdIeBjWUgU9Dqgem79Dte2P1M2-okRa069qwrUZIb61ZfhCFYG8oFMAonozMKGZb1w-Emw==','2026-08-21 12:00:00.000000','2026-08-21 12:15:00.000000','booked','APPT-rehearsal-seed',1,1,6,'2026-08-16 12:33:51.941622','2f9ac4b872f55f94ae8ccc58ad62b34c'),(3,'2026-08-16 13:15:06.570633','2026-08-16 13:15:06.570669','Seeded Appt User','gAAAAABqgbfaaVg1XFxVGUWRjmQCUk87BeisBufWwC8xNUSOQLF6TPsgFupzo9WohFeEdkk6I205A1lUAphshnOGdq0aStgPzg==','2026-09-12 10:00:00.000000','2026-09-12 10:15:00.000000','booked','APPT-reh-DB8B6D',1,1,6,'2026-08-16 13:15:06.570058','2f9ac4b872f55f94ae8ccc58ad62b34c'),(4,'2026-08-16 13:15:27.132253','2026-08-16 13:15:27.132281','Seeded Appt User','gAAAAABqgbfvhbUmeRG0YSRlmUOChN9pSbrWuvTETNOTWl78TYOhe9vyo71UqoAg8fhUAjPi0fOtVu3_gcpuUXyVVgkHWI4Xgg==','2026-08-30 10:00:00.000000','2026-08-30 10:15:00.000000','booked','APPT-reh-08D742',1,1,6,'2026-08-16 13:15:27.131540','2f9ac4b872f55f94ae8ccc58ad62b34c');
/*!40000 ALTER TABLE `appointments_appointment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `appointments_appointmentslot`
--

DROP TABLE IF EXISTS `appointments_appointmentslot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `appointments_appointmentslot` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `slot_start` datetime(6) NOT NULL,
  `slot_end` datetime(6) NOT NULL,
  `capacity` int(11) NOT NULL,
  `booked_count` int(11) NOT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `service_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointments_appointment_branch_id_service_id_slo_7ced3cc9_uniq` (`branch_id`,`service_id`,`slot_start`),
  KEY `appointments_appoint_company_id_8293e11c_fk_companies` (`company_id`),
  KEY `appointments_appoint_service_id_647b81d7_fk_queuing_s` (`service_id`),
  CONSTRAINT `appointments_appoint_branch_id_85af034e_fk_branches_` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `appointments_appoint_company_id_8293e11c_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `appointments_appoint_service_id_647b81d7_fk_queuing_s` FOREIGN KEY (`service_id`) REFERENCES `queuing_service` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments_appointmentslot`
--

LOCK TABLES `appointments_appointmentslot` WRITE;
/*!40000 ALTER TABLE `appointments_appointmentslot` DISABLE KEYS */;
INSERT INTO `appointments_appointmentslot` VALUES (1,'2026-08-16 12:33:51.935097','2026-08-16 12:33:51.935139','2026-08-21 12:00:00.000000','2026-08-21 12:15:00.000000',3,1,1,1,6),(2,'2026-08-16 13:14:25.252788','2026-08-16 13:14:25.252863','2026-08-21 13:00:00.000000','2026-08-21 13:15:00.000000',3,1,1,1,6),(4,'2026-08-16 13:15:06.562508','2026-08-16 13:15:06.563148','2026-09-12 10:00:00.000000','2026-09-12 10:15:00.000000',3,1,1,1,6),(5,'2026-08-16 13:15:27.126543','2026-08-16 13:15:27.126582','2026-08-30 10:00:00.000000','2026-08-30 10:15:00.000000',3,1,1,1,6);
/*!40000 ALTER TABLE `appointments_appointmentslot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_auditlog`
--

DROP TABLE IF EXISTS `audit_auditlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_auditlog` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `action` varchar(255) NOT NULL,
  `object_type` varchar(255) NOT NULL,
  `object_id` varchar(255) DEFAULT NULL,
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`changes`)),
  `ip_address` varchar(50) DEFAULT NULL,
  `actor_id` bigint(20) DEFAULT NULL,
  `branch_id` bigint(20) DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_auditlog_actor_id_20e70a27_fk_accounts_user_id` (`actor_id`),
  KEY `audit_auditlog_branch_id_38a24bbb_fk_branches_branch_id` (`branch_id`),
  KEY `audit_auditlog_company_id_67d5cb07_fk_companies_company_id` (`company_id`),
  CONSTRAINT `audit_auditlog_actor_id_20e70a27_fk_accounts_user_id` FOREIGN KEY (`actor_id`) REFERENCES `accounts_user` (`id`),
  CONSTRAINT `audit_auditlog_branch_id_38a24bbb_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `audit_auditlog_company_id_67d5cb07_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_auditlog`
--

LOCK TABLES `audit_auditlog` WRITE;
/*!40000 ALTER TABLE `audit_auditlog` DISABLE KEYS */;
INSERT INTO `audit_auditlog` VALUES (1,'2026-08-16 11:41:23.896624','2026-08-16 11:41:23.896749','database_backup_executed','System','0','{\"success\": true, \"filename\": \"backup_queuing_solutions_20260816_114120.sql.gz\", \"deleted_backups_count\": 0}','',NULL,NULL,NULL),(2,'2026-08-16 11:43:41.307728','2026-08-16 11:43:41.307833','database_backup_executed','System','0','{\"success\": true, \"filename\": \"backup_queuing_solutions_20260816_114339.sql.gz\", \"deleted_backups_count\": 0}','',NULL,NULL,NULL),(3,'2026-08-16 12:04:27.013200','2026-08-16 12:04:27.013331','database_backup_executed','System','0','{\"success\": true, \"filename\": \"backup_queuing_solutions_20260816_120426.sql.gz\", \"deleted_backups_count\": 0}','',NULL,NULL,NULL),(4,'2026-08-16 12:12:23.774912','2026-08-16 12:12:23.774973','database_backup_executed','System','0','{\"success\": true, \"filename\": \"backup_queuing_solutions_20260816_121222.sql.gz\", \"deleted_backups_count\": 0}','',NULL,NULL,NULL),(5,'2026-08-16 12:33:55.853432','2026-08-16 12:33:55.853488','database_backup_executed','System','0','{\"success\": true, \"filename\": \"backup_queuing_solutions_20260816_123354.sql.gz\", \"deleted_backups_count\": 0}','',NULL,NULL,NULL),(6,'2026-08-16 13:15:10.032630','2026-08-16 13:15:10.032697','database_backup_executed','System','0','{\"success\": true, \"filename\": \"backup_queuing_solutions_20260816_131509.sql.gz\", \"deleted_backups_count\": 0}','',NULL,NULL,NULL);
/*!40000 ALTER TABLE `audit_auditlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',2,'add_permission'),(6,'Can change permission',2,'change_permission'),(7,'Can delete permission',2,'delete_permission'),(8,'Can view permission',2,'view_permission'),(9,'Can add group',3,'add_group'),(10,'Can change group',3,'change_group'),(11,'Can delete group',3,'delete_group'),(12,'Can view group',3,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add blacklisted token',6,'add_blacklistedtoken'),(22,'Can change blacklisted token',6,'change_blacklistedtoken'),(23,'Can delete blacklisted token',6,'delete_blacklistedtoken'),(24,'Can view blacklisted token',6,'view_blacklistedtoken'),(25,'Can add outstanding token',7,'add_outstandingtoken'),(26,'Can change outstanding token',7,'change_outstandingtoken'),(27,'Can delete outstanding token',7,'delete_outstandingtoken'),(28,'Can view outstanding token',7,'view_outstandingtoken'),(29,'Can add platform setting',8,'add_platformsetting'),(30,'Can change platform setting',8,'change_platformsetting'),(31,'Can delete platform setting',8,'delete_platformsetting'),(32,'Can view platform setting',8,'view_platformsetting'),(33,'Can add user',9,'add_user'),(34,'Can change user',9,'change_user'),(35,'Can delete user',9,'delete_user'),(36,'Can view user',9,'view_user'),(37,'Can add otp verification',10,'add_otpverification'),(38,'Can change otp verification',10,'change_otpverification'),(39,'Can delete otp verification',10,'delete_otpverification'),(40,'Can view otp verification',10,'view_otpverification'),(41,'Can add user invite',11,'add_userinvite'),(42,'Can change user invite',11,'change_userinvite'),(43,'Can delete user invite',11,'delete_userinvite'),(44,'Can view user invite',11,'view_userinvite'),(45,'Can add company',12,'add_company'),(46,'Can change company',12,'change_company'),(47,'Can delete company',12,'delete_company'),(48,'Can view company',12,'view_company'),(49,'Can add branch',13,'add_branch'),(50,'Can change branch',13,'change_branch'),(51,'Can delete branch',13,'delete_branch'),(52,'Can view branch',13,'view_branch'),(53,'Can add invoice',14,'add_invoice'),(54,'Can change invoice',14,'change_invoice'),(55,'Can delete invoice',14,'delete_invoice'),(56,'Can view invoice',14,'view_invoice'),(57,'Can add package',15,'add_package'),(58,'Can change package',15,'change_package'),(59,'Can delete package',15,'delete_package'),(60,'Can view package',15,'view_package'),(61,'Can add subscription',16,'add_subscription'),(62,'Can change subscription',16,'change_subscription'),(63,'Can delete subscription',16,'delete_subscription'),(64,'Can view subscription',16,'view_subscription'),(65,'Can add upgrade request',17,'add_upgraderequest'),(66,'Can change upgrade request',17,'change_upgraderequest'),(67,'Can delete upgrade request',17,'delete_upgraderequest'),(68,'Can view upgrade request',17,'view_upgraderequest'),(69,'Can add desk',18,'add_desk'),(70,'Can change desk',18,'change_desk'),(71,'Can delete desk',18,'delete_desk'),(72,'Can view desk',18,'view_desk'),(73,'Can add desk staff assignment',19,'add_deskstaffassignment'),(74,'Can change desk staff assignment',19,'change_deskstaffassignment'),(75,'Can delete desk staff assignment',19,'delete_deskstaffassignment'),(76,'Can view desk staff assignment',19,'view_deskstaffassignment'),(77,'Can add qr code',20,'add_qrcode'),(78,'Can change qr code',20,'change_qrcode'),(79,'Can delete qr code',20,'delete_qrcode'),(80,'Can view qr code',20,'view_qrcode'),(81,'Can add queue method',21,'add_queuemethod'),(82,'Can change queue method',21,'change_queuemethod'),(83,'Can delete queue method',21,'delete_queuemethod'),(84,'Can view queue method',21,'view_queuemethod'),(85,'Can add service',22,'add_service'),(86,'Can change service',22,'change_service'),(87,'Can delete service',22,'delete_service'),(88,'Can view service',22,'view_service'),(89,'Can add ticket',23,'add_ticket'),(90,'Can change ticket',23,'change_ticket'),(91,'Can delete ticket',23,'delete_ticket'),(92,'Can view ticket',23,'view_ticket'),(93,'Can add ticket note',24,'add_ticketnote'),(94,'Can change ticket note',24,'change_ticketnote'),(95,'Can delete ticket note',24,'delete_ticketnote'),(96,'Can view ticket note',24,'view_ticketnote'),(97,'Can add desk service',25,'add_deskservice'),(98,'Can change desk service',25,'change_deskservice'),(99,'Can delete desk service',25,'delete_deskservice'),(100,'Can view desk service',25,'view_deskservice'),(101,'Can add appointment',26,'add_appointment'),(102,'Can change appointment',26,'change_appointment'),(103,'Can delete appointment',26,'delete_appointment'),(104,'Can view appointment',26,'view_appointment'),(105,'Can add appointment slot',27,'add_appointmentslot'),(106,'Can change appointment slot',27,'change_appointmentslot'),(107,'Can delete appointment slot',27,'delete_appointmentslot'),(108,'Can view appointment slot',27,'view_appointmentslot'),(109,'Can add printer',28,'add_printer'),(110,'Can change printer',28,'change_printer'),(111,'Can delete printer',28,'delete_printer'),(112,'Can view printer',28,'view_printer'),(113,'Can add kot print job',29,'add_kotprintjob'),(114,'Can change kot print job',29,'change_kotprintjob'),(115,'Can delete kot print job',29,'delete_kotprintjob'),(116,'Can view kot print job',29,'view_kotprintjob'),(117,'Can add display device',30,'add_displaydevice'),(118,'Can change display device',30,'change_displaydevice'),(119,'Can delete display device',30,'delete_displaydevice'),(120,'Can view display device',30,'view_displaydevice'),(121,'Can add alert rule',31,'add_alertrule'),(122,'Can change alert rule',31,'change_alertrule'),(123,'Can delete alert rule',31,'delete_alertrule'),(124,'Can view alert rule',31,'view_alertrule'),(125,'Can add alert event',32,'add_alertevent'),(126,'Can change alert event',32,'change_alertevent'),(127,'Can delete alert event',32,'delete_alertevent'),(128,'Can view alert event',32,'view_alertevent'),(129,'Can add notification',33,'add_notification'),(130,'Can change notification',33,'change_notification'),(131,'Can delete notification',33,'delete_notification'),(132,'Can view notification',33,'view_notification'),(133,'Can add notification template',34,'add_notificationtemplate'),(134,'Can change notification template',34,'change_notificationtemplate'),(135,'Can delete notification template',34,'delete_notificationtemplate'),(136,'Can view notification template',34,'view_notificationtemplate'),(137,'Can add report snapshot',35,'add_reportsnapshot'),(138,'Can change report snapshot',35,'change_reportsnapshot'),(139,'Can delete report snapshot',35,'delete_reportsnapshot'),(140,'Can view report snapshot',35,'view_reportsnapshot'),(141,'Can add feedback',36,'add_feedback'),(142,'Can change feedback',36,'change_feedback'),(143,'Can delete feedback',36,'delete_feedback'),(144,'Can view feedback',36,'view_feedback'),(145,'Can add audit log',37,'add_auditlog'),(146,'Can change audit log',37,'change_auditlog'),(147,'Can delete audit log',37,'delete_auditlog'),(148,'Can view audit log',37,'view_auditlog');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing_invoice`
--

DROP TABLE IF EXISTS `billing_invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_invoice` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `status` varchar(20) NOT NULL,
  `payment_gateway_ref` varchar(255) DEFAULT NULL,
  `issued_at` datetime(6) NOT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `company_id` bigint(20) NOT NULL,
  `subscription_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `billing_invoice_company_id_f0aed760_fk_companies_company_id` (`company_id`),
  KEY `billing_invoice_subscription_id_b7df633b_fk_billing_s` (`subscription_id`),
  CONSTRAINT `billing_invoice_company_id_f0aed760_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `billing_invoice_subscription_id_b7df633b_fk_billing_s` FOREIGN KEY (`subscription_id`) REFERENCES `billing_subscription` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing_invoice`
--

LOCK TABLES `billing_invoice` WRITE;
/*!40000 ALTER TABLE `billing_invoice` DISABLE KEYS */;
/*!40000 ALTER TABLE `billing_invoice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing_package`
--

DROP TABLE IF EXISTS `billing_package`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_package` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `name` varchar(255) NOT NULL,
  `max_branches` int(11) NOT NULL,
  `max_users` int(11) NOT NULL,
  `price_monthly` decimal(10,2) NOT NULL,
  `price_yearly` decimal(10,2) NOT NULL,
  `feature_flags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`feature_flags`)),
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing_package`
--

LOCK TABLES `billing_package` WRITE;
/*!40000 ALTER TABLE `billing_package` DISABLE KEYS */;
INSERT INTO `billing_package` VALUES (1,'2026-08-16 06:53:57.696301','2026-08-16 06:53:57.696362','Starter',1,2,49.00,490.00,'{\"method1\": true, \"kot\": true}',1),(2,'2026-08-16 06:53:57.705167','2026-08-16 06:53:57.705214','Standard',3,5,99.00,990.00,'{\"method1\": true, \"method2\": true}',1),(3,'2026-08-16 06:53:57.711989','2026-08-16 06:53:57.712015','Advanced',10,20,199.00,1990.00,'{\"method1\": true, \"method2\": true, \"method3\": true, \"display\": true}',1),(4,'2026-08-16 06:53:57.716455','2026-08-16 06:53:57.716480','Enterprise',999,999,499.00,4990.00,'{\"method1\": true, \"method2\": true, \"method3\": true, \"method4\": true, \"display\": true, \"kot\": true, \"remote_booking\": true}',1);
/*!40000 ALTER TABLE `billing_package` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing_subscription`
--

DROP TABLE IF EXISTS `billing_subscription`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_subscription` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `billing_cycle` varchar(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  `auto_renew` tinyint(1) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `package_id` bigint(20) NOT NULL,
  `bonus_branches` int(11) NOT NULL,
  `bonus_users` int(11) NOT NULL,
  `feature_overrides` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`feature_overrides`)),
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `trial_end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `billing_subscription_company_id_252addf5_fk_companies_company_id` (`company_id`),
  KEY `billing_subscription_package_id_66cfca88_fk_billing_package_id` (`package_id`),
  CONSTRAINT `billing_subscription_company_id_252addf5_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `billing_subscription_package_id_66cfca88_fk_billing_package_id` FOREIGN KEY (`package_id`) REFERENCES `billing_package` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing_subscription`
--

LOCK TABLES `billing_subscription` WRITE;
/*!40000 ALTER TABLE `billing_subscription` DISABLE KEYS */;
INSERT INTO `billing_subscription` VALUES (1,'2026-08-16 06:53:58.464605','2026-08-16 06:53:58.464630','monthly','2026-08-16','2026-09-15','active',1,1,4,0,0,'{}',NULL,NULL,NULL),(2,'2026-08-16 06:53:58.492592','2026-08-16 06:53:58.492617','monthly','2026-08-16','2026-09-15','active',1,2,2,0,0,'{}',NULL,NULL,NULL);
/*!40000 ALTER TABLE `billing_subscription` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing_upgraderequest`
--

DROP TABLE IF EXISTS `billing_upgraderequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_upgraderequest` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `type` varchar(20) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`details`)),
  `status` varchar(20) NOT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `company_id` bigint(20) NOT NULL,
  `requested_by_id` bigint(20) NOT NULL,
  `reviewed_by_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `billing_upgradereque_company_id_685488d1_fk_companies` (`company_id`),
  KEY `billing_upgradereque_requested_by_id_e85447ea_fk_accounts_` (`requested_by_id`),
  KEY `billing_upgradereque_reviewed_by_id_0aa0e888_fk_accounts_` (`reviewed_by_id`),
  CONSTRAINT `billing_upgradereque_company_id_685488d1_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `billing_upgradereque_requested_by_id_e85447ea_fk_accounts_` FOREIGN KEY (`requested_by_id`) REFERENCES `accounts_user` (`id`),
  CONSTRAINT `billing_upgradereque_reviewed_by_id_0aa0e888_fk_accounts_` FOREIGN KEY (`reviewed_by_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing_upgraderequest`
--

LOCK TABLES `billing_upgraderequest` WRITE;
/*!40000 ALTER TABLE `billing_upgraderequest` DISABLE KEYS */;
/*!40000 ALTER TABLE `billing_upgraderequest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches_branch`
--

DROP TABLE IF EXISTS `branches_branch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches_branch` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `address` longtext NOT NULL,
  `city` varchar(100) NOT NULL,
  `geo_lat` decimal(9,6) DEFAULT NULL,
  `geo_lng` decimal(9,6) DEFAULT NULL,
  `timezone` varchar(100) NOT NULL,
  `operating_hours` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`operating_hours`)),
  `status` varchar(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_branch_company_id_slug_24c4652f_uniq` (`company_id`,`slug`),
  CONSTRAINT `branches_branch_company_id_a8cfb028_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches_branch`
--

LOCK TABLES `branches_branch` WRITE;
/*!40000 ALTER TABLE `branches_branch` DISABLE KEYS */;
INSERT INTO `branches_branch` VALUES (1,'2026-08-16 06:53:58.471474','2026-08-16 06:53:58.471500','Ahmedabad Central','b_amd_central','Opp. Income Tax Office, Ashram Road','Ahmedabad',NULL,NULL,'Asia/Kolkata','{}','active',1),(2,'2026-08-16 06:53:58.476546','2026-08-16 06:53:58.476571','Baroda Clinic','baroda-clinic','Alkapuri Main Road, Vadodara','Vadodara',NULL,NULL,'Asia/Kolkata','{}','active',1),(3,'2026-08-16 06:53:58.498867','2026-08-16 06:53:58.498892','Surat Diagnostics','surat-diagnostics','Ring Road, Surat','Surat',NULL,NULL,'Asia/Kolkata','{}','active',2);
/*!40000 ALTER TABLE `branches_branch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies_company`
--

DROP TABLE IF EXISTS `companies_company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `companies_company` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `name` varchar(255) NOT NULL,
  `industry` varchar(255) NOT NULL,
  `contact_email` varchar(254) NOT NULL,
  `contact_phone` longtext NOT NULL,
  `logo_url` varchar(512) DEFAULT NULL,
  `brand_colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`brand_colors`)),
  `status` varchar(20) NOT NULL,
  `package_id` bigint(20) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contact_email` (`contact_email`),
  KEY `companies_company_package_id_bac0b352_fk_billing_package_id` (`package_id`),
  CONSTRAINT `companies_company_package_id_bac0b352_fk_billing_package_id` FOREIGN KEY (`package_id`) REFERENCES `billing_package` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies_company`
--

LOCK TABLES `companies_company` WRITE;
/*!40000 ALTER TABLE `companies_company` DISABLE KEYS */;
INSERT INTO `companies_company` VALUES (1,'2026-08-16 06:53:58.457271','2026-08-16 06:53:58.457296','Apollo Care Center','Healthcare','rhea.mehta@apollocare.in','+91 9876543210',NULL,'{}','active',4,NULL,NULL),(2,'2026-08-16 06:53:58.484197','2026-08-16 06:53:58.484226','Star Diagnostics','Diagnostics','john.doe@star.in','+91 9999988888',NULL,'{}','active',2,NULL,NULL);
/*!40000 ALTER TABLE `companies_company` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_platformsetting`
--

DROP TABLE IF EXISTS `core_platformsetting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `core_platformsetting` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`value`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_platformsetting`
--

LOCK TABLES `core_platformsetting` WRITE;
/*!40000 ALTER TABLE `core_platformsetting` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_platformsetting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `display_displaydevice`
--

DROP TABLE IF EXISTS `display_displaydevice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `display_displaydevice` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `pairing_code` varchar(20) NOT NULL,
  `desk_group` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`desk_group`)),
  `layout` varchar(100) NOT NULL,
  `last_seen_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pairing_code` (`pairing_code`),
  KEY `display_displaydevice_branch_id_d95b7956_fk_branches_branch_id` (`branch_id`),
  KEY `display_displaydevic_company_id_9e41be0c_fk_companies` (`company_id`),
  CONSTRAINT `display_displaydevic_company_id_9e41be0c_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `display_displaydevice_branch_id_d95b7956_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `display_displaydevice`
--

LOCK TABLES `display_displaydevice` WRITE;
/*!40000 ALTER TABLE `display_displaydevice` DISABLE KEYS */;
/*!40000 ALTER TABLE `display_displaydevice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_admin_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext DEFAULT NULL,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint(5) unsigned NOT NULL CHECK (`action_flag` >= 0),
  `change_message` longtext NOT NULL,
  `content_type_id` int(11) DEFAULT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_accounts_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_content_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (10,'accounts','otpverification'),(9,'accounts','user'),(11,'accounts','userinvite'),(1,'admin','logentry'),(35,'analytics','reportsnapshot'),(26,'appointments','appointment'),(27,'appointments','appointmentslot'),(37,'audit','auditlog'),(3,'auth','group'),(2,'auth','permission'),(14,'billing','invoice'),(15,'billing','package'),(16,'billing','subscription'),(17,'billing','upgraderequest'),(13,'branches','branch'),(12,'companies','company'),(4,'contenttypes','contenttype'),(8,'core','platformsetting'),(30,'display','displaydevice'),(36,'feedback','feedback'),(29,'kot','kotprintjob'),(28,'kot','printer'),(32,'notifications','alertevent'),(31,'notifications','alertrule'),(33,'notifications','notification'),(34,'notifications','notificationtemplate'),(18,'queuing','desk'),(25,'queuing','deskservice'),(19,'queuing','deskstaffassignment'),(20,'queuing','qrcode'),(21,'queuing','queuemethod'),(22,'queuing','service'),(23,'queuing','ticket'),(24,'queuing','ticketnote'),(5,'sessions','session'),(6,'token_blacklist','blacklistedtoken'),(7,'token_blacklist','outstandingtoken');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_migrations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'billing','0001_initial','2026-08-16 06:53:37.754536'),(2,'companies','0001_initial','2026-08-16 06:53:37.859176'),(3,'branches','0001_initial','2026-08-16 06:53:37.983427'),(4,'contenttypes','0001_initial','2026-08-16 06:53:38.023456'),(5,'contenttypes','0002_remove_content_type_name','2026-08-16 06:53:38.107965'),(6,'auth','0001_initial','2026-08-16 06:53:38.440481'),(7,'auth','0002_alter_permission_name_max_length','2026-08-16 06:53:38.506708'),(8,'auth','0003_alter_user_email_max_length','2026-08-16 06:53:38.514868'),(9,'auth','0004_alter_user_username_opts','2026-08-16 06:53:38.525612'),(10,'auth','0005_alter_user_last_login_null','2026-08-16 06:53:38.534653'),(11,'auth','0006_require_contenttypes_0002','2026-08-16 06:53:38.539208'),(12,'auth','0007_alter_validators_add_error_messages','2026-08-16 06:53:38.549556'),(13,'auth','0008_alter_user_username_max_length','2026-08-16 06:53:38.564214'),(14,'auth','0009_alter_user_last_name_max_length','2026-08-16 06:53:38.574515'),(15,'auth','0010_alter_group_name_max_length','2026-08-16 06:53:38.586107'),(16,'auth','0011_update_proxy_permissions','2026-08-16 06:53:38.599931'),(17,'auth','0012_alter_user_first_name_max_length','2026-08-16 06:53:38.610520'),(18,'accounts','0001_initial','2026-08-16 06:53:38.685288'),(19,'accounts','0002_initial','2026-08-16 06:53:39.300288'),(20,'admin','0001_initial','2026-08-16 06:53:39.473739'),(21,'admin','0002_logentry_remove_auto_add','2026-08-16 06:53:39.491907'),(22,'admin','0003_logentry_add_action_flag_choices','2026-08-16 06:53:39.509236'),(23,'analytics','0001_initial','2026-08-16 06:53:39.523900'),(24,'analytics','0002_initial','2026-08-16 06:53:39.666557'),(25,'queuing','0001_initial','2026-08-16 06:53:41.335505'),(26,'appointments','0001_initial','2026-08-16 06:53:41.389845'),(27,'appointments','0002_initial','2026-08-16 06:53:42.020691'),(28,'audit','0001_initial','2026-08-16 06:53:42.133002'),(29,'audit','0002_initial','2026-08-16 06:53:42.360173'),(30,'billing','0002_initial','2026-08-16 06:53:43.110251'),(31,'core','0001_initial','2026-08-16 06:53:43.157412'),(32,'display','0001_initial','2026-08-16 06:53:43.496337'),(33,'feedback','0001_initial','2026-08-16 06:53:43.926842'),(34,'kot','0001_initial','2026-08-16 06:53:44.292979'),(35,'notifications','0001_initial','2026-08-16 06:53:45.111295'),(36,'sessions','0001_initial','2026-08-16 06:53:45.152307'),(37,'token_blacklist','0001_initial','2026-08-16 06:53:45.452728'),(38,'token_blacklist','0002_outstandingtoken_jti_hex','2026-08-16 06:53:45.534916'),(39,'token_blacklist','0003_auto_20171017_2007','2026-08-16 06:53:45.626193'),(40,'token_blacklist','0004_auto_20171017_2013','2026-08-16 06:53:45.726600'),(41,'token_blacklist','0005_remove_outstandingtoken_jti','2026-08-16 06:53:45.773169'),(42,'token_blacklist','0006_auto_20171017_2113','2026-08-16 06:53:45.812354'),(43,'token_blacklist','0007_auto_20171017_2214','2026-08-16 06:53:47.601295'),(44,'token_blacklist','0008_migrate_to_bigautofield','2026-08-16 06:53:48.124181'),(45,'token_blacklist','0010_fix_migrate_to_bigautofield','2026-08-16 06:53:48.188295'),(46,'token_blacklist','0011_linearizes_history','2026-08-16 06:53:48.191380'),(47,'token_blacklist','0012_alter_outstandingtoken_user','2026-08-16 06:53:48.249946'),(48,'billing','0003_subscription_bonus_branches_subscription_bonus_users_and_more','2026-08-16 07:08:30.933666'),(49,'companies','0002_alter_company_status','2026-08-16 07:08:30.970170'),(50,'companies','0003_company_address_company_city','2026-08-16 07:12:03.838240'),(51,'queuing','0002_service_prefix_alter_service_unique_together','2026-08-16 07:21:58.551204'),(52,'queuing','0003_desk_status','2026-08-16 07:25:14.292469'),(53,'accounts','0003_otpverification_email_alter_otpverification_phone','2026-08-16 08:40:37.146049'),(54,'kot','0002_printer_token','2026-08-16 08:40:37.294701'),(55,'queuing','0004_ticket_scheduled_for','2026-08-16 08:40:37.389698'),(56,'billing','0004_subscription_stripe_customer_id_and_more','2026-08-16 09:08:43.408492'),(57,'accounts','0004_alter_otpverification_phone_alter_user_phone_and_more','2026-08-16 10:52:48.319846'),(58,'appointments','0003_appointment_customer_consented_at_and_more','2026-08-16 10:52:49.163879'),(59,'companies','0004_alter_company_contact_phone','2026-08-16 10:52:49.452880'),(60,'queuing','0005_ticket_customer_consented_at_and_more','2026-08-16 10:52:50.424886');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback_feedback`
--

DROP TABLE IF EXISTS `feedback_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feedback_feedback` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` longtext DEFAULT NULL,
  `appointment_id` bigint(20) DEFAULT NULL,
  `branch_id` bigint(20) DEFAULT NULL,
  `company_id` bigint(20) NOT NULL,
  `ticket_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `feedback_feedback_appointment_id_22355654_fk_appointme` (`appointment_id`),
  KEY `feedback_feedback_branch_id_e55d1846_fk_branches_branch_id` (`branch_id`),
  KEY `feedback_feedback_company_id_7775e35f_fk_companies_company_id` (`company_id`),
  KEY `feedback_feedback_ticket_id_c2ac4f37_fk_queuing_ticket_id` (`ticket_id`),
  CONSTRAINT `feedback_feedback_appointment_id_22355654_fk_appointme` FOREIGN KEY (`appointment_id`) REFERENCES `appointments_appointment` (`id`),
  CONSTRAINT `feedback_feedback_branch_id_e55d1846_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `feedback_feedback_company_id_7775e35f_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `feedback_feedback_ticket_id_c2ac4f37_fk_queuing_ticket_id` FOREIGN KEY (`ticket_id`) REFERENCES `queuing_ticket` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback_feedback`
--

LOCK TABLES `feedback_feedback` WRITE;
/*!40000 ALTER TABLE `feedback_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kot_kotprintjob`
--

DROP TABLE IF EXISTS `kot_kotprintjob`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kot_kotprintjob` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `status` varchar(20) NOT NULL,
  `printed_at` datetime(6) DEFAULT NULL,
  `ticket_id` bigint(20) NOT NULL,
  `printer_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `kot_kotprintjob_ticket_id_7b5d7066_fk_queuing_ticket_id` (`ticket_id`),
  KEY `kot_kotprintjob_printer_id_58580188_fk_kot_printer_id` (`printer_id`),
  CONSTRAINT `kot_kotprintjob_printer_id_58580188_fk_kot_printer_id` FOREIGN KEY (`printer_id`) REFERENCES `kot_printer` (`id`),
  CONSTRAINT `kot_kotprintjob_ticket_id_7b5d7066_fk_queuing_ticket_id` FOREIGN KEY (`ticket_id`) REFERENCES `queuing_ticket` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kot_kotprintjob`
--

LOCK TABLES `kot_kotprintjob` WRITE;
/*!40000 ALTER TABLE `kot_kotprintjob` DISABLE KEYS */;
/*!40000 ALTER TABLE `kot_kotprintjob` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kot_printer`
--

DROP TABLE IF EXISTS `kot_printer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kot_printer` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `name` varchar(255) NOT NULL,
  `connection_type` varchar(20) NOT NULL,
  `last_status` varchar(255) DEFAULT NULL,
  `last_checked_at` datetime(6) DEFAULT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `kot_printer_branch_id_8b49702b_fk_branches_branch_id` (`branch_id`),
  KEY `kot_printer_company_id_0b3852cb_fk_companies_company_id` (`company_id`),
  CONSTRAINT `kot_printer_branch_id_8b49702b_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `kot_printer_company_id_0b3852cb_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kot_printer`
--

LOCK TABLES `kot_printer` WRITE;
/*!40000 ALTER TABLE `kot_printer` DISABLE KEYS */;
/*!40000 ALTER TABLE `kot_printer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications_alertevent`
--

DROP TABLE IF EXISTS `notifications_alertevent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications_alertevent` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `triggered_at` datetime(6) NOT NULL,
  `resolved_at` datetime(6) DEFAULT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `alert_rule_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_alerte_branch_id_e2be76b5_fk_branches_` (`branch_id`),
  KEY `notifications_alerte_company_id_339e2c7f_fk_companies` (`company_id`),
  KEY `notifications_alerte_alert_rule_id_fed110a9_fk_notificat` (`alert_rule_id`),
  CONSTRAINT `notifications_alerte_alert_rule_id_fed110a9_fk_notificat` FOREIGN KEY (`alert_rule_id`) REFERENCES `notifications_alertrule` (`id`),
  CONSTRAINT `notifications_alerte_branch_id_e2be76b5_fk_branches_` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `notifications_alerte_company_id_339e2c7f_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications_alertevent`
--

LOCK TABLES `notifications_alertevent` WRITE;
/*!40000 ALTER TABLE `notifications_alertevent` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications_alertevent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications_alertrule`
--

DROP TABLE IF EXISTS `notifications_alertrule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications_alertrule` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `trigger_type` varchar(50) NOT NULL,
  `threshold` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`threshold`)),
  `channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`channels`)),
  `recipients` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`recipients`)),
  `is_active` tinyint(1) NOT NULL,
  `branch_id` bigint(20) DEFAULT NULL,
  `company_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_alertrule_branch_id_a64ed1ad_fk_branches_branch_id` (`branch_id`),
  KEY `notifications_alertr_company_id_14e42319_fk_companies` (`company_id`),
  CONSTRAINT `notifications_alertr_company_id_14e42319_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `notifications_alertrule_branch_id_a64ed1ad_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications_alertrule`
--

LOCK TABLES `notifications_alertrule` WRITE;
/*!40000 ALTER TABLE `notifications_alertrule` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications_alertrule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications_notification`
--

DROP TABLE IF EXISTS `notifications_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications_notification` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `type` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` longtext NOT NULL,
  `channel` varchar(20) NOT NULL,
  `is_read` tinyint(1) NOT NULL,
  `branch_id` bigint(20) DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notifi_branch_id_6cb9b468_fk_branches_` (`branch_id`),
  KEY `notifications_notifi_company_id_b6cbe5b5_fk_companies` (`company_id`),
  KEY `notifications_notification_user_id_b5e8c0ff_fk_accounts_user_id` (`user_id`),
  CONSTRAINT `notifications_notifi_branch_id_6cb9b468_fk_branches_` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `notifications_notifi_company_id_b6cbe5b5_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `notifications_notification_user_id_b5e8c0ff_fk_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications_notification`
--

LOCK TABLES `notifications_notification` WRITE;
/*!40000 ALTER TABLE `notifications_notification` DISABLE KEYS */;
INSERT INTO `notifications_notification` VALUES (1,'2026-08-16 12:33:51.956313','2026-08-16 12:33:51.956354','appointment_booked','New Appointment Booked','A new appointment has been booked by \'Seeded Appt User\' for slot \'2026-08-21 12:00:00+00:00\'.','in_app',0,1,1,3),(2,'2026-08-16 13:15:06.605541','2026-08-16 13:15:06.605577','appointment_booked','New Appointment Booked','A new appointment has been booked by \'Seeded Appt User\' for slot \'2026-09-12 10:00:00+00:00\'.','in_app',0,1,1,3),(3,'2026-08-16 13:15:27.147215','2026-08-16 13:15:27.147243','appointment_booked','New Appointment Booked','A new appointment has been booked by \'Seeded Appt User\' for slot \'2026-08-30 10:00:00+00:00\'.','in_app',0,1,1,3);
/*!40000 ALTER TABLE `notifications_notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications_notificationtemplate`
--

DROP TABLE IF EXISTS `notifications_notificationtemplate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications_notificationtemplate` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `code` varchar(100) NOT NULL,
  `channel` varchar(50) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body_template` longtext NOT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notifi_company_id_a90d8640_fk_companies` (`company_id`),
  CONSTRAINT `notifications_notifi_company_id_a90d8640_fk_companies` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications_notificationtemplate`
--

LOCK TABLES `notifications_notificationtemplate` WRITE;
/*!40000 ALTER TABLE `notifications_notificationtemplate` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications_notificationtemplate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_desk`
--

DROP TABLE IF EXISTS `queuing_desk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_desk` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `status` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `queuing_desk_branch_id_ec9b67ac_fk_branches_branch_id` (`branch_id`),
  KEY `queuing_desk_company_id_5db9fa42_fk_companies_company_id` (`company_id`),
  CONSTRAINT `queuing_desk_branch_id_ec9b67ac_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `queuing_desk_company_id_5db9fa42_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_desk`
--

LOCK TABLES `queuing_desk` WRITE;
/*!40000 ALTER TABLE `queuing_desk` DISABLE KEYS */;
INSERT INTO `queuing_desk` VALUES (1,'2026-08-16 06:54:03.778739','2026-08-16 06:54:03.778780','Counter 01',1,1,1,'offline'),(2,'2026-08-16 06:54:03.785070','2026-08-16 06:54:03.785096','Counter 02',1,1,1,'offline'),(3,'2026-08-16 06:54:03.826508','2026-08-16 06:54:03.826533','Desk A',1,3,2,'offline');
/*!40000 ALTER TABLE `queuing_desk` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_deskservice`
--

DROP TABLE IF EXISTS `queuing_deskservice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_deskservice` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `desk_id` bigint(20) NOT NULL,
  `service_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `queuing_deskservice_desk_id_service_id_0ece6a09_uniq` (`desk_id`,`service_id`),
  KEY `queuing_deskservice_service_id_ef9d1924_fk_queuing_service_id` (`service_id`),
  CONSTRAINT `queuing_deskservice_desk_id_a20aeea9_fk_queuing_desk_id` FOREIGN KEY (`desk_id`) REFERENCES `queuing_desk` (`id`),
  CONSTRAINT `queuing_deskservice_service_id_ef9d1924_fk_queuing_service_id` FOREIGN KEY (`service_id`) REFERENCES `queuing_service` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_deskservice`
--

LOCK TABLES `queuing_deskservice` WRITE;
/*!40000 ALTER TABLE `queuing_deskservice` DISABLE KEYS */;
INSERT INTO `queuing_deskservice` VALUES (6,'2026-08-16 07:22:14.714892','2026-08-16 07:22:14.714917',1,6),(7,'2026-08-16 07:22:14.719817','2026-08-16 07:22:14.719841',1,7),(8,'2026-08-16 07:22:14.727507','2026-08-16 07:22:14.727532',2,8),(9,'2026-08-16 07:22:14.745837','2026-08-16 07:22:14.745865',3,9),(10,'2026-08-16 07:22:14.750233','2026-08-16 07:22:14.750258',3,10);
/*!40000 ALTER TABLE `queuing_deskservice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_deskstaffassignment`
--

DROP TABLE IF EXISTS `queuing_deskstaffassignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_deskstaffassignment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `shift_start` datetime(6) NOT NULL,
  `shift_end` datetime(6) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `desk_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `queuing_deskstaffassignment_desk_id_e93b1fa0_fk_queuing_desk_id` (`desk_id`),
  KEY `queuing_deskstaffassignment_user_id_e3f986c1_fk_accounts_user_id` (`user_id`),
  CONSTRAINT `queuing_deskstaffassignment_desk_id_e93b1fa0_fk_queuing_desk_id` FOREIGN KEY (`desk_id`) REFERENCES `queuing_desk` (`id`),
  CONSTRAINT `queuing_deskstaffassignment_user_id_e3f986c1_fk_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_deskstaffassignment`
--

LOCK TABLES `queuing_deskstaffassignment` WRITE;
/*!40000 ALTER TABLE `queuing_deskstaffassignment` DISABLE KEYS */;
/*!40000 ALTER TABLE `queuing_deskstaffassignment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_qrcode`
--

DROP TABLE IF EXISTS `queuing_qrcode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_qrcode` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `method` varchar(2) NOT NULL,
  `image_url` varchar(512) NOT NULL,
  `generated_at` datetime(6) NOT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `queuing_qrcode_branch_id_60c24fd0_fk_branches_branch_id` (`branch_id`),
  KEY `queuing_qrcode_company_id_a7849ef0_fk_companies_company_id` (`company_id`),
  CONSTRAINT `queuing_qrcode_branch_id_60c24fd0_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `queuing_qrcode_company_id_a7849ef0_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_qrcode`
--

LOCK TABLES `queuing_qrcode` WRITE;
/*!40000 ALTER TABLE `queuing_qrcode` DISABLE KEYS */;
/*!40000 ALTER TABLE `queuing_qrcode` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_queuemethod`
--

DROP TABLE IF EXISTS `queuing_queuemethod`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_queuemethod` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `method` varchar(2) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config`)),
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `queuing_queuemethod_branch_id_f2c063c4_fk_branches_branch_id` (`branch_id`),
  KEY `queuing_queuemethod_company_id_c831087d_fk_companies_company_id` (`company_id`),
  CONSTRAINT `queuing_queuemethod_branch_id_f2c063c4_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `queuing_queuemethod_company_id_c831087d_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_queuemethod`
--

LOCK TABLES `queuing_queuemethod` WRITE;
/*!40000 ALTER TABLE `queuing_queuemethod` DISABLE KEYS */;
/*!40000 ALTER TABLE `queuing_queuemethod` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_service`
--

DROP TABLE IF EXISTS `queuing_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_service` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `name` varchar(255) NOT NULL,
  `est_service_minutes` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `prefix` varchar(2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `queuing_service_branch_id_prefix_4e042c74_uniq` (`branch_id`,`prefix`),
  KEY `queuing_service_company_id_f12cbcf1_fk_companies_company_id` (`company_id`),
  CONSTRAINT `queuing_service_branch_id_b69d7709_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `queuing_service_company_id_f12cbcf1_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_service`
--

LOCK TABLES `queuing_service` WRITE;
/*!40000 ALTER TABLE `queuing_service` DISABLE KEYS */;
INSERT INTO `queuing_service` VALUES (6,'2026-08-16 07:22:14.696849','2026-08-16 07:22:14.696883','General Checkup',15,1,1,1,'A'),(7,'2026-08-16 07:22:14.701881','2026-08-16 07:22:14.701907','Consultation',20,1,1,1,'B'),(8,'2026-08-16 07:22:14.708782','2026-08-16 07:22:14.708808','Billing',10,1,1,1,'C'),(9,'2026-08-16 07:22:14.733914','2026-08-16 07:22:14.733940','Blood Test',10,1,3,2,'A'),(10,'2026-08-16 07:22:14.739603','2026-08-16 07:22:14.739652','X-Ray',30,1,3,2,'B');
/*!40000 ALTER TABLE `queuing_service` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_ticket`
--

DROP TABLE IF EXISTS `queuing_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_ticket` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `method` varchar(2) NOT NULL,
  `token_number` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` longtext DEFAULT NULL,
  `message` longtext DEFAULT NULL,
  `source` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL,
  `called_at` datetime(6) DEFAULT NULL,
  `served_at` datetime(6) DEFAULT NULL,
  `closed_at` datetime(6) DEFAULT NULL,
  `branch_id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `desk_id` bigint(20) DEFAULT NULL,
  `served_by_id` bigint(20) DEFAULT NULL,
  `service_id` bigint(20) DEFAULT NULL,
  `scheduled_for` datetime(6) DEFAULT NULL,
  `customer_consented_at` datetime(6) DEFAULT NULL,
  `customer_phone_index` varchar(64) DEFAULT NULL,
  `tracking_code` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `queuing_ticket_tracking_code_049aa3b7_uniq` (`tracking_code`),
  KEY `queuing_ticket_branch_id_fb731ff4_fk_branches_branch_id` (`branch_id`),
  KEY `queuing_ticket_company_id_c0705d88_fk_companies_company_id` (`company_id`),
  KEY `queuing_ticket_desk_id_4a04f8bf_fk_queuing_desk_id` (`desk_id`),
  KEY `queuing_ticket_served_by_id_332e0fa7_fk_accounts_user_id` (`served_by_id`),
  KEY `queuing_ticket_service_id_bc2a48bc_fk_queuing_service_id` (`service_id`),
  KEY `queuing_ticket_customer_phone_index_4088fc01` (`customer_phone_index`),
  CONSTRAINT `queuing_ticket_branch_id_fb731ff4_fk_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches_branch` (`id`),
  CONSTRAINT `queuing_ticket_company_id_c0705d88_fk_companies_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies_company` (`id`),
  CONSTRAINT `queuing_ticket_desk_id_4a04f8bf_fk_queuing_desk_id` FOREIGN KEY (`desk_id`) REFERENCES `queuing_desk` (`id`),
  CONSTRAINT `queuing_ticket_served_by_id_332e0fa7_fk_accounts_user_id` FOREIGN KEY (`served_by_id`) REFERENCES `accounts_user` (`id`),
  CONSTRAINT `queuing_ticket_service_id_bc2a48bc_fk_queuing_service_id` FOREIGN KEY (`service_id`) REFERENCES `queuing_service` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_ticket`
--

LOCK TABLES `queuing_ticket` WRITE;
/*!40000 ALTER TABLE `queuing_ticket` DISABLE KEYS */;
INSERT INTO `queuing_ticket` VALUES (1,'2026-08-16 12:33:51.792836','2026-08-16 12:33:51.792911','2','S001','Seeded Ticket User','gAAAAABqga4vEUffaAqmMWuWoWFPFYek5WAoyZDENnnof-2JuVHskXe3hHhb2cTigTTkwYfqMPAhWtV_xNkex22lY9rOgyxvYQ==',NULL,'qr','waiting',NULL,NULL,NULL,1,1,NULL,NULL,6,NULL,'2026-08-16 12:33:51.787373','8c6b0b39144e443f02b7116af1ee1b5e','TKT-9EBkuYJkO7rDPVrHjqMO1g'),(2,'2026-08-16 13:14:25.130417','2026-08-16 13:14:25.130469','2','S001','Seeded Ticket User','gAAAAABqgbexpd1qw_dHAruViDryS4T0YCGaSaQtKYfod7TNFuEAJbhnKh195gWP9alUJEENLmtZVRdabBZYPJqHSr0WWEUGOQ==',NULL,'qr','waiting',NULL,NULL,NULL,1,1,NULL,NULL,6,NULL,'2026-08-16 13:14:25.127747','8c6b0b39144e443f02b7116af1ee1b5e','TKT-WDBSJAosF83sa7Sdpf0SEQ'),(3,'2026-08-16 13:14:48.643875','2026-08-16 13:14:48.643908','2','S5506','Seeded Ticket User','gAAAAABqgbfIjRBck0QAjhM7PQnHrGfxtwdT7UYPdIq7vJoAs1ywy-Kjd4RrZOL7dcvNRXK5okhR7W-WtLrlvo-baJar4f2fkQ==',NULL,'qr','waiting',NULL,NULL,NULL,1,1,NULL,NULL,6,NULL,'2026-08-16 13:14:48.642727','8c6b0b39144e443f02b7116af1ee1b5e','TKT-61xxckXAawflpefJXoFtxA'),(4,'2026-08-16 13:15:06.542152','2026-08-16 13:15:06.542209','2','SDB8B','Seeded Ticket User','gAAAAABqgbfaw8z0k3U9rqU5bHzyoi99_wTPSmgfMXYRiX42KV-BnZE_lV3r8KbLVcLzRJXNqTPAsi7pormVRg-yhw9_lKgGmw==',NULL,'qr','waiting',NULL,NULL,NULL,1,1,NULL,NULL,6,NULL,'2026-08-16 13:15:06.540469','8c6b0b39144e443f02b7116af1ee1b5e','TKT-1aV-lhXVb5IQWDgX2jAcEg'),(5,'2026-08-16 13:15:27.117640','2026-08-16 13:15:27.117676','2','S08D7','Seeded Ticket User','gAAAAABqgbfvYJI27oWp8uAisJqPJ_qlX-vAtKLLJT8XH0no1-54RajplGyh00gj_zKUisuz3_h4rDKundTHXehvN-8S8BOdRw==',NULL,'qr','waiting',NULL,NULL,NULL,1,1,NULL,NULL,6,NULL,'2026-08-16 13:15:27.116065','8c6b0b39144e443f02b7116af1ee1b5e','TKT-O3QpaaIJ8oRrMOV3WS4Tjw');
/*!40000 ALTER TABLE `queuing_ticket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `queuing_ticketnote`
--

DROP TABLE IF EXISTS `queuing_ticketnote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `queuing_ticketnote` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `note` longtext NOT NULL,
  `ticket_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `queuing_ticketnote_ticket_id_c87b25e4_fk_queuing_ticket_id` (`ticket_id`),
  KEY `queuing_ticketnote_user_id_c48c3c0e_fk_accounts_user_id` (`user_id`),
  CONSTRAINT `queuing_ticketnote_ticket_id_c87b25e4_fk_queuing_ticket_id` FOREIGN KEY (`ticket_id`) REFERENCES `queuing_ticket` (`id`),
  CONSTRAINT `queuing_ticketnote_user_id_c48c3c0e_fk_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `queuing_ticketnote`
--

LOCK TABLES `queuing_ticketnote` WRITE;
/*!40000 ALTER TABLE `queuing_ticketnote` DISABLE KEYS */;
/*!40000 ALTER TABLE `queuing_ticketnote` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_blacklist_blacklistedtoken`
--

DROP TABLE IF EXISTS `token_blacklist_blacklistedtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token_blacklist_blacklistedtoken` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `blacklisted_at` datetime(6) NOT NULL,
  `token_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_id` (`token_id`),
  CONSTRAINT `token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk` FOREIGN KEY (`token_id`) REFERENCES `token_blacklist_outstandingtoken` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_blacklist_blacklistedtoken`
--

LOCK TABLES `token_blacklist_blacklistedtoken` WRITE;
/*!40000 ALTER TABLE `token_blacklist_blacklistedtoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `token_blacklist_blacklistedtoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_blacklist_outstandingtoken`
--

DROP TABLE IF EXISTS `token_blacklist_outstandingtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token_blacklist_outstandingtoken` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `token` longtext NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `jti` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq` (`jti`),
  KEY `token_blacklist_outs_user_id_83bc629a_fk_accounts_` (`user_id`),
  CONSTRAINT `token_blacklist_outs_user_id_83bc629a_fk_accounts_` FOREIGN KEY (`user_id`) REFERENCES `accounts_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_blacklist_outstandingtoken`
--

LOCK TABLES `token_blacklist_outstandingtoken` WRITE;
/*!40000 ALTER TABLE `token_blacklist_outstandingtoken` DISABLE KEYS */;
/*!40000 ALTER TABLE `token_blacklist_outstandingtoken` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-16 18:45:29
