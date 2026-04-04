const DATABASE_KEY = 'pathfinder.mock.supabase.db';

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const createDatabase = () => ({
  profiles: {},
});

const readDatabase = () => {
  if (typeof window === 'undefined') {
    return createDatabase();
  }

  try {
    const rawDatabase = window.localStorage.getItem(DATABASE_KEY);
    return rawDatabase ? JSON.parse(rawDatabase) : createDatabase();
  } catch {
    return createDatabase();
  }
};

const writeDatabase = (database) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
};

export const fetchProfile = async (userId) => {
  await wait(450);
  const database = readDatabase();
  return database.profiles[userId] ?? null;
};

export const upsertProfile = async (userId, profile) => {
  await wait(650);
  const database = readDatabase();
  const record = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  database.profiles[userId] = record;
  writeDatabase(database);
  return record;
};
