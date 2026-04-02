ALTER TABLE "rag_queries"
  ALTER COLUMN "embedding_cost" TYPE numeric(18,10),
  ALTER COLUMN "rewritten_query_cost" TYPE numeric(18,10),
  ALTER COLUMN "total_cost" TYPE numeric(18,10);
