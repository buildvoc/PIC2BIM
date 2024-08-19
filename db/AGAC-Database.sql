-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 20, 2024 at 09:54 AM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.1.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ibrahim`
--

-- --------------------------------------------------------

--
-- Table structure for table `demandes`
--

CREATE TABLE `demandes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reference` varchar(255) NOT NULL,
  `emissionID` bigint(20) UNSIGNED DEFAULT NULL,
  `userID` bigint(20) UNSIGNED DEFAULT NULL,
  `motif` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `doc` text DEFAULT NULL,
  `serviceID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `emissions`
--

CREATE TABLE `emissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reference` varchar(255) NOT NULL,
  `card_number` int(11) NOT NULL,
  `serie` varchar(255) DEFAULT NULL,
  `dateemission` date DEFAULT NULL,
  `expire` date DEFAULT NULL,
  `duree` varchar(20) DEFAULT NULL,
  `motif` varchar(255) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `statut` int(11) NOT NULL DEFAULT 0,
  `servicesID` bigint(20) UNSIGNED NOT NULL,
  `userID` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `accompagnateur` bigint(20) UNSIGNED DEFAULT NULL,
  `pieceChild` varchar(255) DEFAULT NULL,
  `pieceAC` varchar(255) DEFAULT NULL,
  `numAC` varchar(255) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `family_information` varchar(255) DEFAULT NULL,
  `child1` bigint(20) UNSIGNED DEFAULT NULL,
  `child2` bigint(20) UNSIGNED DEFAULT NULL,
  `child3` bigint(20) UNSIGNED DEFAULT NULL,
  `child4` bigint(20) UNSIGNED DEFAULT NULL,
  `child5` bigint(20) UNSIGNED DEFAULT NULL,
  `escale` varchar(255) DEFAULT NULL,
  `accompagnateurOther` varchar(255) DEFAULT NULL,
  `tarif` decimal(8,2) NOT NULL DEFAULT 0.00,
  `typemontant` varchar(255) NOT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `family_information`
--

CREATE TABLE `family_information` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `age` varchar(255) DEFAULT NULL,
  `sexe` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `groupes`
--

CREATE TABLE `groupes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `userID` bigint(20) UNSIGNED NOT NULL,
  `emissionID` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pages`
--

CREATE TABLE `pages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pages`
--

INSERT INTO `pages` (`id`, `libelle`, `created_at`, `updated_at`, `deleted_at`) VALUES
(2, 'Laisser-Passer', '2023-07-15 18:22:00', '2024-07-15 18:30:58', NULL),
(3, 'Autorisation Parentale', '2023-07-15 18:22:11', '2023-07-15 18:22:11', NULL),
(4, 'Certificat de déménagement', '2023-07-15 18:22:23', '2023-07-15 18:37:04', NULL),
(6, 'Services', '2023-07-15 18:39:20', '2024-07-15 18:36:07', NULL),
(8, 'Utilisateurs', '2023-07-15 18:39:49', '2024-07-17 15:22:38', NULL),
(9, 'Roles', '2023-07-15 18:39:53', '2024-07-12 16:07:13', NULL),
(10, 'Permissions', '2023-07-15 18:39:59', '2024-07-12 16:07:20', NULL),
(12, 'Immatriculation', '2024-07-15 18:31:29', '2024-07-15 18:31:29', NULL),
(13, 'Etal Civil', '2024-07-15 18:32:06', '2024-07-15 18:32:06', NULL),
(14, 'Carte d\'Identité Consulaire', '2024-07-15 18:50:21', '2024-07-15 18:50:21', NULL),
(15, 'Carte Consulaire', '2024-07-15 18:50:55', '2024-07-15 18:50:55', NULL),
(16, 'Indicateurs', '2024-07-15 18:52:09', '2024-07-15 18:52:09', NULL),
(17, 'Pages', '2024-07-15 18:52:39', '2024-07-15 18:52:39', NULL),
(19, 'Demandes de service', '2024-07-16 08:32:34', '2024-07-16 08:32:34', NULL),
(20, 'Demandes d\'immatriculation', '2024-07-16 08:33:29', '2024-07-16 08:33:29', NULL),
(21, 'Rapports', '2024-07-17 16:25:15', '2024-07-16 19:00:00', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `modification` tinyint(1) NOT NULL DEFAULT 0,
  `suppression` tinyint(1) NOT NULL DEFAULT 0,
  `impression` tinyint(1) NOT NULL DEFAULT 0,
  `ajouter` tinyint(1) NOT NULL DEFAULT 0,
  `view` bigint(20) DEFAULT 0,
  `role` bigint(20) UNSIGNED NOT NULL,
  `page` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `processuses`
--

CREATE TABLE `processuses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `servicesID` bigint(20) UNSIGNED NOT NULL,
  `userID` bigint(20) UNSIGNED NOT NULL,
  `ordre` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `libelle` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `libelle`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Super Administrateur', NULL, '2024-07-15 18:42:26', '2024-07-15 18:42:26', NULL),
(2, 'Administrateur', NULL, '2024-07-15 18:43:38', '2024-07-15 18:43:38', NULL),
(3, 'Agents', NULL, '2024-07-15 18:43:49', '2024-07-15 18:43:49', NULL),
(4, 'Usagers', NULL, '2024-07-15 18:44:16', '2024-07-15 18:44:16', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `designation` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `expiry_in_months` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `tarif` int(11) NOT NULL DEFAULT 0,
  `agentTarif` int(11) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `designation`, `code`, `expiry_in_months`, `description`, `created_at`, `updated_at`, `tarif`, `agentTarif`, `deleted_at`) VALUES
(1, 'Laisser-Passer', 'L', 3, 'Laisser-Passer', '2023-07-15 19:06:47', '2023-10-10 18:08:45', 5000, 0, NULL),
(2, 'Autorisation Parentale', 'A', 3, 'Autorisation Parentale', '2023-07-15 19:09:47', '2023-10-10 18:08:57', 5000, 0, NULL),
(3, 'Certificat de déménagement', 'D', 3, 'Certificat de déménagement', '2023-07-15 19:10:11', '2023-07-15 19:10:11', 5000, 0, NULL),
(4, 'Carte Consulaire', 'C', 60, 'Carte Consulaire', '2023-07-16 08:08:52', '2023-10-10 18:09:14', 10000, 0, NULL),
(5, 'Carte d\'Identité Consulaire', 'N', 60, 'Carte d\'Identité Consulaire', '2023-08-25 16:55:45', '2024-07-12 18:38:30', 5000, 100, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `taches`
--

CREATE TABLE `taches` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `processusID` bigint(20) UNSIGNED NOT NULL,
  `emissionID` bigint(20) UNSIGNED NOT NULL,
  `demandeID` bigint(20) UNSIGNED NOT NULL,
  `userID` bigint(20) UNSIGNED NOT NULL,
  `statut` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `usagers`
--

CREATE TABLE `usagers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `identification` varchar(255) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `prenom` varchar(255) DEFAULT NULL,
  `datenaissance` date DEFAULT NULL,
  `lieunaissance` varchar(255) DEFAULT NULL,
  `typedoc` varchar(255) DEFAULT NULL,
  `num_doc` varchar(255) DEFAULT NULL,
  `sexe` tinyint(1) DEFAULT NULL,
  `situationfamiliale` varchar(255) DEFAULT NULL,
  `epoux` varchar(255) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `contact1` varchar(255) DEFAULT NULL,
  `contact2` varchar(255) DEFAULT NULL,
  `profession` varchar(255) DEFAULT NULL,
  `personne1` varchar(255) DEFAULT NULL,
  `contactpersonne1` varchar(255) DEFAULT NULL,
  `personne2` varchar(255) DEFAULT NULL,
  `contactpersonne2` varchar(255) DEFAULT NULL,
  `pere` varchar(255) DEFAULT NULL,
  `mere` varchar(255) DEFAULT NULL,
  `tranche` varchar(255) DEFAULT NULL,
  `enfantde` bigint(20) UNSIGNED DEFAULT NULL,
  `userID` bigint(20) UNSIGNED DEFAULT NULL,
  `observation` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `taille` varchar(256) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `roleID` bigint(20) UNSIGNED NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_admins`
--

CREATE TABLE `user_admins` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `is_super` tinyint(1) NOT NULL DEFAULT 0,
  `address` varchar(255) DEFAULT NULL,
  `language` varchar(255) DEFAULT NULL,
  `town` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `post_code` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `twoFaCode` bigint(20) UNSIGNED DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `session_id` text DEFAULT NULL,
  `status` varchar(255) DEFAULT 'active',
  `role` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_admins`
--

INSERT INTO `user_admins` (`id`, `name`, `email`, `password`, `phone`, `is_super`, `address`, `language`, `town`, `state`, `post_code`, `country`, `description`, `avatar`, `is_deleted`, `twoFaCode`, `remember_token`, `created_at`, `updated_at`, `deleted_at`, `session_id`, `status`, `role`) VALUES
(1, 'Azim', 'ibrahim@gmail.com', '$2y$10$GWOqqtAx/p6S2Y6JvEDgZemIS2qdBD5Ixt4giwZOM/BnnqAzs0ihu', '12345678981', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '172243logo.png', 0, NULL, 'oE2IDcLz2T', '2023-06-07 07:16:59', '2024-07-20 01:52:51', NULL, 'VoebVYxGKysKPZpZhyNZkxvtKSXhIFa3JgKzctaU', 'active', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_requested_documents`
--

CREATE TABLE `user_requested_documents` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `prenom` varchar(255) DEFAULT NULL,
  `sexe` tinyint(4) DEFAULT NULL,
  `profession` varchar(255) DEFAULT NULL,
  `situationfamiliale` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `demandes`
--
ALTER TABLE `demandes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `emissions`
--
ALTER TABLE `emissions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `family_information`
--
ALTER TABLE `family_information`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `groupes`
--
ALTER TABLE `groupes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pages`
--
ALTER TABLE `pages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Indexes for table `processuses`
--
ALTER TABLE `processuses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `taches`
--
ALTER TABLE `taches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `usagers`
--
ALTER TABLE `usagers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `user_admins`
--
ALTER TABLE `user_admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `admins_email_unique` (`email`);

--
-- Indexes for table `user_requested_documents`
--
ALTER TABLE `user_requested_documents`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `demandes`
--
ALTER TABLE `demandes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `emissions`
--
ALTER TABLE `emissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `family_information`
--
ALTER TABLE `family_information`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `groupes`
--
ALTER TABLE `groupes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pages`
--
ALTER TABLE `pages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `usagers`
--
ALTER TABLE `usagers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_admins`
--
ALTER TABLE `user_admins`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_requested_documents`
--
ALTER TABLE `user_requested_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
