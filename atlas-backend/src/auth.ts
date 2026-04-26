import { betterAuth } from "better-auth";
import { Kysely, PostgresDialect } from "kysely";
import pkg from "pg";
import dotenv from "dotenv";

const { Pool } = pkg;
dotenv.config();

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = new Kysely({
  dialect: new PostgresDialect({ pool: dbPool }),
});

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: {
    db: db,
    type: "postgres",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://atlas-front-virid.vercel.app",
  ],
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      httpOnly: true,
      domain: undefined,
    },
    crossSubdomainCookies: {
      enabled: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CLIENT",
        input: true,
      },
      numero_telephone: {
        type: "string",
        required: false,
      },
      url_avatar: {
        type: "string",
        required: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
});
