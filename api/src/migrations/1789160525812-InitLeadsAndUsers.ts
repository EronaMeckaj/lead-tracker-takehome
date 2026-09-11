import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitLeadsAndUsers1789160525812 implements MigrationInterface {
  name = 'InitLeadsAndUsers1789160525812';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`CREATE TYPE "lead_stage" AS ENUM ('new', 'contacted', 'closed')`);
    await queryRunner.query(`CREATE TYPE "lead_source" AS ENUM ('form', 'webhook')`);

    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "message" text NOT NULL,
        "stage" "lead_stage" NOT NULL DEFAULT 'new',
        "source" "lead_source" NOT NULL DEFAULT 'form',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leads_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_leads_stage" ON "leads" ("stage")`);
    await queryRunner.query(`CREATE INDEX "IDX_leads_created_at" ON "leads" ("created_at")`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "google_id" character varying NOT NULL,
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "avatar_url" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_google_id" UNIQUE ("google_id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "IDX_leads_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_leads_stage"`);
    await queryRunner.query(`DROP TABLE "leads"`);
    await queryRunner.query(`DROP TYPE "lead_source"`);
    await queryRunner.query(`DROP TYPE "lead_stage"`);
  }
}
