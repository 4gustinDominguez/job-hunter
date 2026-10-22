import { desc, eq } from "drizzle-orm";
import { NotFoundError } from "@/application/errors";
import type { ApplicationRepositoryPort } from "@/application/ports/application-repository-port";
import type { Application } from "@/domain/application/application";
import type { ApplicationStatus } from "@/domain/application/enums";
import type { Contact } from "@/domain/application/contact";
import type { db } from "./client";
import { applications, contacts } from "./schema";

type Db = typeof db;
type ApplicationRow = typeof applications.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;

function toDomainContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role ?? undefined,
    company: row.company ?? undefined,
    linkedin: row.linkedin ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function toDomainApplication(row: ApplicationRow, contact: ContactRow | null): Application {
  return {
    id: row.id,
    jobId: row.jobId,
    status: row.status,
    appliedAt: row.appliedAt ?? undefined,
    cvVersion: row.cvVersion ?? undefined,
    coverLetterVersion: row.coverLetterVersion ?? undefined,
    emailVersion: row.emailVersion ?? undefined,
    contact: contact ? toDomainContact(contact) : undefined,
    notes: row.notes ?? undefined,
    nextActionAt: row.nextActionAt ?? undefined,
  };
}

export class DrizzleApplicationRepository implements ApplicationRepositoryPort {
  constructor(private readonly database: Db) {}

  async getById(id: string): Promise<Application | null> {
    const [row] = await this.database
      .select({ application: applications, contact: contacts })
      .from(applications)
      .leftJoin(contacts, eq(applications.contactId, contacts.id))
      .where(eq(applications.id, id))
      .limit(1);
    if (!row) return null;
    return toDomainApplication(row.application, row.contact);
  }

  async list(): Promise<Application[]> {
    const rows = await this.database
      .select({ application: applications, contact: contacts })
      .from(applications)
      .leftJoin(contacts, eq(applications.contactId, contacts.id))
      .orderBy(desc(applications.createdAt));
    return rows.map((row) => toDomainApplication(row.application, row.contact));
  }

  async create(application: Application): Promise<Application> {
    let contactRow: ContactRow | null = null;
    if (application.contact) {
      const [inserted] = await this.database
        .insert(contacts)
        .values({
          id: application.contact.id,
          name: application.contact.name,
          email: application.contact.email ?? null,
          phone: application.contact.phone ?? null,
          role: application.contact.role ?? null,
          company: application.contact.company ?? null,
          linkedin: application.contact.linkedin ?? null,
          notes: application.contact.notes ?? null,
        })
        .returning();
      contactRow = inserted;
    }
    const [row] = await this.database
      .insert(applications)
      .values({
        id: application.id,
        jobId: application.jobId,
        status: application.status,
        appliedAt: application.appliedAt ?? null,
        cvVersion: application.cvVersion ?? null,
        coverLetterVersion: application.coverLetterVersion ?? null,
        emailVersion: application.emailVersion ?? null,
        contactId: contactRow?.id ?? null,
        notes: application.notes ?? null,
        nextActionAt: application.nextActionAt ?? null,
      })
      .returning();
    return toDomainApplication(row, contactRow);
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    patch?: { appliedAt?: Date; note?: string; nextActionAt?: Date },
  ): Promise<Application> {
    const current = await this.getById(id);
    if (!current) {
      throw new NotFoundError("Application", id);
    }
    const appliedAt = patch?.appliedAt ?? current.appliedAt;
    const nextActionAt = patch?.nextActionAt ?? current.nextActionAt;
    const notes = patch?.note ? [...(current.notes ?? []), patch.note] : current.notes;
    await this.database
      .update(applications)
      .set({
        status,
        appliedAt: appliedAt ?? null,
        nextActionAt: nextActionAt ?? null,
        notes: notes ?? null,
      })
      .where(eq(applications.id, id));
    return { ...current, status, appliedAt, nextActionAt, notes };
  }
}
