-- Replace flat retrieved_documents with meta_data (retrieved + LLM extraction + pipeline meta)
ALTER TABLE "rag_queries" ADD COLUMN "meta_data" jsonb;

UPDATE "rag_queries"
SET "meta_data" = jsonb_build_object(
  'retrieved', COALESCE("retrieved_documents", '[]'::jsonb),
  'query_understanding', NULL::jsonb,
  'retrieval_meta', NULL::jsonb
);

ALTER TABLE "rag_queries" DROP COLUMN "retrieved_documents";
