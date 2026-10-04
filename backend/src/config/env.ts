import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('8080'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres_secure_pwd@postgres:5432/karurtaxi_db'),
  REDIS_URL: z.string().default('redis://redis:6379'),
  OSRM_URL: z.string().default('http://osrm:5000'),
  PHOTON_URL: z.string().default('http://photon:2322'),
  EDEST_API_KEY: z.string().optional(),
  FCM_SERVER_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export const env = envSchema.parse(process.env);
