CREATE TABLE "docs" (
  "id" serial PRIMARY KEY,
  "project_id" integer REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_path" text NOT NULL,
  "mime_type" varchar(100),
  "size" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
