import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { doctors } from "./doctor";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    doctorId: uuid("doctorId")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => {
    return {
      idxUserId: index("idx_reviews_userId").on(table.userId),
      idxDoctorId: index("idx_reviews_doctorId").on(table.doctorId),
      idxRating: index("idx_reviews_rating").on(table.rating),
      idxCreatedAt: index("idx_reviews_createdAt").on(table.createdAt),
    };
  }
);

