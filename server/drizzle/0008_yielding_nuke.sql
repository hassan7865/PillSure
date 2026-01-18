CREATE TABLE IF NOT EXISTS "drug_category_specialization_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"drug_category" varchar(100) NOT NULL,
	"specialization" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rag_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"embedding_cost" numeric(10, 6),
	"rewritten_query" text,
	"rewritten_query_cost" numeric(10, 6),
	"total_cost" numeric(10, 6),
	"retrieved_documents" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_mapping" ON "drug_category_specialization_mapping" USING btree ("drug_category","specialization");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_queries_query" ON "rag_queries" USING btree ("query");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_queries_created_at" ON "rag_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rag_queries_rewritten_query" ON "rag_queries" USING btree ("rewritten_query");