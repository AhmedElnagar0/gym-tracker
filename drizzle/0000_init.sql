CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`variant_label` text,
	`muscle_group` text NOT NULL,
	`mechanic` text NOT NULL,
	`equipment` text NOT NULL,
	`is_unilateral` integer DEFAULT false NOT NULL,
	`photo_file` text,
	`archived_at` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "exercises_muscle_group_ck" CHECK("muscle_group" IN ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core')),
	CONSTRAINT "exercises_mechanic_ck" CHECK("mechanic" IN ('compound', 'isolation')),
	CONSTRAINT "exercises_equipment_ck" CHECK("equipment" IN ('barbell', 'ez_bar', 'trap_bar', 'smith_machine', 'plate_loaded', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bodyweight')),
	CONSTRAINT "exercises_not_own_parent_ck" CHECK("parent_id" IS NULL OR "parent_id" <> "id"),
	CONSTRAINT "exercises_name_not_blank_ck" CHECK(length(trim("name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_name_unique_ci` ON `exercises` (lower("name"));--> statement-breakpoint
CREATE INDEX `exercises_parent_idx` ON `exercises` (`parent_id`);--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`reps` integer NOT NULL,
	`rpe` real,
	`set_type` text DEFAULT 'working' NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sets_weight_ck" CHECK("weight_kg" >= 0),
	CONSTRAINT "sets_reps_ck" CHECK("reps" >= 0),
	CONSTRAINT "sets_rpe_ck" CHECK("rpe" IS NULL OR ("rpe" >= 1 AND "rpe" <= 10)),
	CONSTRAINT "sets_set_type_ck" CHECK("set_type" IN ('warmup', 'working', 'dropset', 'failure'))
);
--> statement-breakpoint
CREATE INDEX `sets_workout_exercise_idx` ON `sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `split_day_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`split_day_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`target_sets` integer DEFAULT 3 NOT NULL,
	FOREIGN KEY (`split_day_id`) REFERENCES `split_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "split_day_exercises_target_sets_ck" CHECK("target_sets" >= 1)
);
--> statement-breakpoint
CREATE INDEX `split_day_exercises_day_idx` ON `split_day_exercises` (`split_day_id`);--> statement-breakpoint
CREATE INDEX `split_day_exercises_exercise_idx` ON `split_day_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `split_days` (
	`id` text PRIMARY KEY NOT NULL,
	`split_id` text NOT NULL,
	`name` text NOT NULL,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`split_id`) REFERENCES `splits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `split_days_split_idx` ON `split_days` (`split_id`);--> statement-breakpoint
CREATE TABLE `split_schedule` (
	`split_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`split_day_id` text NOT NULL,
	PRIMARY KEY(`split_id`, `weekday`),
	FOREIGN KEY (`split_id`) REFERENCES `splits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`split_day_id`) REFERENCES `split_days`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "split_schedule_weekday_ck" CHECK("weekday" BETWEEN 0 AND 6)
);
--> statement-breakpoint
CREATE INDEX `split_schedule_day_idx` ON `split_schedule` (`split_day_id`);--> statement-breakpoint
CREATE TABLE `splits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`schedule_mode` text DEFAULT 'rotation' NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	CONSTRAINT "splits_schedule_mode_ck" CHECK("schedule_mode" IN ('rotation', 'weekday'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `splits_one_active` ON `splits` (`is_active`) WHERE "is_active" = 1;--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`superset_group` integer,
	`target_sets` integer,
	`notes` text,
	`next_increase_weight` integer DEFAULT false NOT NULL,
	`next_increase_reps` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "workout_exercises_target_sets_ck" CHECK("target_sets" IS NULL OR "target_sets" >= 1)
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_exercises_exercise_idx` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`notes` text,
	`split_day_id` text,
	FOREIGN KEY (`split_day_id`) REFERENCES `split_days`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "workouts_end_after_start_ck" CHECK("ended_at" IS NULL OR "ended_at" >= "started_at")
);
--> statement-breakpoint
CREATE INDEX `workouts_started_at_idx` ON `workouts` (`started_at`);--> statement-breakpoint
CREATE INDEX `workouts_split_day_idx` ON `workouts` (`split_day_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workouts_one_active` ON `workouts` (("ended_at" IS NULL)) WHERE "ended_at" IS NULL;