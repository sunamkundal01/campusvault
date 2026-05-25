import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  picture: text("picture"),
  role: text("role", { enum: ["student", "admin"] }).notNull().default("student"),
  branch: text("branch"),
  batchYear: integer("batch_year"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  isBlocked: integer("is_blocked", { mode: "boolean" }).notNull().default(false),
});

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoDriveId: text("logo_drive_id"),
    hiringRole: text("hiring_role"),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ slugIdx: uniqueIndex("companies_slug_idx").on(t.slug) })
);

export const oaSets = sqliteTable(
  "oa_sets",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    college: text("college"),
    year: integer("year"),
    conductedForBatch: integer("conducted_for_batch"),
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }),
    durationMin: integer("duration_min"),
    ctc: text("ctc"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    createdBy: text("created_by").references(() => users.id),
  },
  (t) => ({
    companyIdx: index("oa_sets_company_idx").on(t.companyId),
    yearIdx: index("oa_sets_year_idx").on(t.year),
    collegeIdx: index("oa_sets_college_idx").on(t.college),
  })
);

export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    oaSetId: text("oa_set_id")
      .notNull()
      .references(() => oaSets.id, { onDelete: "cascade" }),
    driveFileId: text("drive_file_id").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    displayName: text("display_name").notNull(),
    kind: text("kind", { enum: ["pdf", "image", "zip", "doc", "other"] }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    uploadedBy: text("uploaded_by").references(() => users.id),
    showAttribution: integer("show_attribution", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["pending", "approved", "rejected", "removed"] })
      .notNull()
      .default("approved"),
    reportCount: integer("report_count").notNull().default(0),
    rejectionReason: text("rejection_reason"),
    uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    oaIdx: index("files_oa_idx").on(t.oaSetId),
    uploaderIdx: index("files_uploader_idx").on(t.uploadedBy),
    statusIdx: index("files_status_idx").on(t.status),
  })
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category", { enum: ["topic", "difficulty", "round"] }).notNull().default("topic"),
  },
  (t) => ({ nameIdx: uniqueIndex("tags_name_idx").on(t.name) })
);

export const oaSetTags = sqliteTable(
  "oa_set_tags",
  {
    oaSetId: text("oa_set_id")
      .notNull()
      .references(() => oaSets.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.oaSetId, t.tagId] }) })
);

export const interviewExperiences = sqliteTable(
  "interview_experiences",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["video", "blog"] }).notNull(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: text("role"),
    college: text("college"),
    year: integer("year"),
    // Videos
    youtubeUrl: text("youtube_url"),
    youtubeVideoId: text("youtube_video_id"),
    // Blogs
    title: text("title"),
    content: text("content"),
    // Attribution: blogs always show authorName; videos optional
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    status: text("status", { enum: ["approved", "removed"] }).notNull().default("approved"),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    companyIdx: index("interviews_company_idx").on(t.companyId),
    kindIdx: index("interviews_kind_idx").on(t.kind),
    statusIdx: index("interviews_status_idx").on(t.status),
    createdIdx: index("interviews_created_idx").on(t.createdAt),
  })
);

export const placementEntries = sqliteTable(
  "placement_entries",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    college: text("college").notNull(),
    entryType: text("entry_type", { enum: ["entry", "intern", "fte", "ppo"] })
      .notNull()
      .default("entry"),
    oaDate: text("oa_date"),
    ctc: text("ctc"),
    cgpaCriteria: text("cgpa_criteria"),
    mtechEligible: integer("mtech_eligible", { mode: "boolean" }),
    notes: text("notes"),
    uploadedBy: text("uploaded_by").references(() => users.id),
    showAttribution: integer("show_attribution", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["approved", "pending", "rejected", "removed"] })
      .notNull()
      .default("approved"),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    companyIdx: index("placement_company_idx").on(t.companyId),
    collegeIdx: index("placement_college_idx").on(t.college),
    statusIdx: index("placement_status_idx").on(t.status),
    createdIdx: index("placement_created_idx").on(t.createdAt),
  })
);

export const oaLinks = sqliteTable(
  "oa_links",
  {
    id: text("id").primaryKey(),
    oaSetId: text("oa_set_id")
      .notNull()
      .references(() => oaSets.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label"),
    addedBy: text("added_by").references(() => users.id),
    showAttribution: integer("show_attribution", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["pending", "approved", "rejected", "removed"] })
      .notNull()
      .default("approved"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    oaIdx: index("oa_links_oa_idx").on(t.oaSetId),
    statusIdx: index("oa_links_status_idx").on(t.status),
  })
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason", {
      enum: ["not_oa", "copyrighted", "low_quality", "offensive", "other"],
    }).notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    fileIdx: index("reports_file_idx").on(t.fileId),
    uniqReporter: uniqueIndex("reports_unique_reporter").on(t.fileId, t.reporterId),
  })
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    userIdx: index("audit_user_idx").on(t.userId),
    timeIdx: index("audit_time_idx").on(t.createdAt),
  })
);

export const viewTokens = sqliteTable("view_tokens", {
  jti: text("jti").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  consumed: integer("consumed", { mode: "boolean" }).notNull().default(false),
});

export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type OaSet = typeof oaSets.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type OaLink = typeof oaLinks.$inferSelect;
export type PlacementEntry = typeof placementEntries.$inferSelect;
export type InterviewExperience = typeof interviewExperiences.$inferSelect;
