import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const ragQueries = pgTable(
  "rag_queries",
  {
    id: serial("id").primaryKey(),
    query: text("query").notNull(),
    embeddingCost: numeric("embedding_cost", { precision: 18, scale: 10 }),
    rewrittenQuery: text("rewritten_query"),
    rewrittenQueryCost: numeric("rewritten_query_cost", { precision: 18, scale: 10 }),
    totalCost: numeric("total_cost", { precision: 18, scale: 10 }),
    metaData: jsonb("meta_data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      idxQuery: index("idx_rag_queries_query").on(table.query),
      idxCreatedAt: index("idx_rag_queries_created_at").on(table.createdAt),
      idxRewrittenQuery: index("idx_rag_queries_rewritten_query").on(
        table.rewrittenQuery
      ),
    };
  }
);
