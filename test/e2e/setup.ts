import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, inject } from 'vitest';

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: `dtpf-e2e-${randomUUID()}` });
});

afterAll(async () => {
  // A suite may have disconnected on purpose to exercise the health check.
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});
