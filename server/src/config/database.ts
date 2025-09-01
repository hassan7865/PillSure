import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Role } from "../entities/Role";

export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "pillsure",
  password: process.env.DB_PASS || "pillsure123",
  database: process.env.DB_NAME || "pillsure",
  entities: [User, Role],
  migrations: ["src/migrations/*.ts"],
  synchronize: false,
});
