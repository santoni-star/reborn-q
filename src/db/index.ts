import Dexie from 'dexie';

export const db = new Dexie('AppDB') as Dexie & {
  users: Dexie.Table<User, string>;
};

db.version(1).stores({
  users: 'id, email, name, createdAt',
});

export const initDb = async (): Promise<void> => {
  await db.open();
};
