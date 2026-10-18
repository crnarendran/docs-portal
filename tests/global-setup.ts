import { seedDocs } from './support/seed';

export default async function globalSetup() {
  await seedDocs();
}
