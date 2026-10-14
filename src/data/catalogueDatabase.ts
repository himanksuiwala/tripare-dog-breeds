import type { SQLiteDatabase } from "expo-sqlite";
import { openDatabaseAsync } from "expo-sqlite";

import type { BreedDetails } from "../api/breedDetails";
import type { Breed, BreedGroup } from "../api/breeds";

const DATABASE_NAME = "doggo.db";

type BreedRow = {
  id: string;
  name: string;
  life_min: number;
  life_max: number;
  hypoallergenic: number;
  thumbnail_url: string | null;
  other_names_json: string;
  group_id: string | null;
  maximum_weight: number | null;
  coat_length: string | null;
  coat_type: string | null;
  social_traits_json: string | null;
};

type GroupRow = { id: string; name: string };
type DetailsRow = { payload_json: string };
type SyncRow = {
  last_successful_sync_at: number | null;
  total_records: number | null;
  total_pages: number | null;
  loaded_pages: number;
  is_complete: number;
};

export type CachedCatalogue = {
  breeds: Breed[];
  groups: BreedGroup[];
  lastSuccessfulSyncAt: number | null;
  totalRecords: number | null;
  totalPages: number | null;
  loadedPages: number;
  isComplete: boolean;
};

export type CatalogueSnapshot = {
  breeds: Breed[];
  details: BreedDetails[];
  groups: BreedGroup[] | null;
  totalRecords: number;
  totalPages: number;
  loadedPages: number;
  isComplete: boolean;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;

function parseStringArray(json: string): string[] {
  const value: unknown = JSON.parse(json);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseSocialTraits(json: string | null): Breed["socialTraits"] {
  if (json === null) return null;
  const value: unknown = JSON.parse(json);
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.goodWithChildren !== "number" ||
    typeof record.goodWithDogs !== "number" ||
    typeof record.goodWithStrangers !== "number"
  ) {
    return null;
  }
  return {
    goodWithChildren: record.goodWithChildren,
    goodWithDogs: record.goodWithDogs,
    goodWithStrangers: record.goodWithStrangers,
  };
}

function isBreedDetails(value: unknown): value is BreedDetails {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.description === "string" &&
    typeof record.life === "object" &&
    typeof record.traits === "object" &&
    Array.isArray(record.images)
  );
}

async function migrateDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS breed_groups (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS breeds (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      life_min INTEGER NOT NULL,
      life_max INTEGER NOT NULL,
      hypoallergenic INTEGER NOT NULL,
      thumbnail_url TEXT,
      other_names_json TEXT NOT NULL,
      group_id TEXT REFERENCES breed_groups(id) ON DELETE SET NULL,
      maximum_weight REAL,
      coat_length TEXT,
      coat_type TEXT,
      social_traits_json TEXT,
      page_number INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS breed_details (
      breed_id TEXT PRIMARY KEY NOT NULL REFERENCES breeds(id) ON DELETE CASCADE,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_metadata (
      resource TEXT PRIMARY KEY NOT NULL,
      last_successful_sync_at INTEGER,
      total_records INTEGER,
      total_pages INTEGER,
      loaded_pages INTEGER NOT NULL DEFAULT 0,
      is_complete INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS breeds_name_index ON breeds(name);
    CREATE INDEX IF NOT EXISTS breeds_group_index ON breeds(group_id);
    CREATE INDEX IF NOT EXISTS breeds_page_index ON breeds(page_number);
  `);
}

export function getCatalogueDatabase(): Promise<SQLiteDatabase> {
  if (databasePromise === null) {
    databasePromise = openDatabaseAsync(DATABASE_NAME).then(
      async (database) => {
        await migrateDatabase(database);
        return database;
      },
    );
  }
  return databasePromise;
}

export async function readCachedCatalogue(): Promise<CachedCatalogue> {
  const database = await getCatalogueDatabase();
  const [breedRows, groupRows, syncRow] = await Promise.all([
    database.getAllAsync<BreedRow>("SELECT * FROM breeds ORDER BY name"),
    database.getAllAsync<GroupRow>(
      "SELECT id, name FROM breed_groups ORDER BY name",
    ),
    database.getFirstAsync<SyncRow>(
      "SELECT last_successful_sync_at, total_records, total_pages, loaded_pages, is_complete FROM sync_metadata WHERE resource = ?",
      "catalogue",
    ),
  ]);

  return {
    breeds: breedRows.map((row) => ({
      id: row.id,
      name: row.name,
      lifeMin: row.life_min,
      lifeMax: row.life_max,
      hypoallergenic: row.hypoallergenic === 1,
      thumbnailUrl: row.thumbnail_url,
      otherNames: parseStringArray(row.other_names_json),
      groupId: row.group_id,
      maximumWeight: row.maximum_weight,
      coatLength: row.coat_length,
      coatType: row.coat_type,
      socialTraits: parseSocialTraits(row.social_traits_json),
    })),
    groups: groupRows,
    lastSuccessfulSyncAt: syncRow?.last_successful_sync_at ?? null,
    totalRecords: syncRow?.total_records ?? null,
    totalPages: syncRow?.total_pages ?? null,
    loadedPages: syncRow?.loaded_pages ?? 0,
    isComplete: syncRow?.is_complete === 1,
  };
}

export async function readCachedBreedDetails(
  breedId: string,
): Promise<BreedDetails | null> {
  const database = await getCatalogueDatabase();
  const row = await database.getFirstAsync<DetailsRow>(
    "SELECT payload_json FROM breed_details WHERE breed_id = ?",
    breedId,
  );
  if (!row) return null;
  const value: unknown = JSON.parse(row.payload_json);
  return isBreedDetails(value) ? value : null;
}

export async function upsertCachedBreedDetails(
  details: BreedDetails,
): Promise<void> {
  const database = await getCatalogueDatabase();
  await database.runAsync(
    `INSERT INTO breed_details (breed_id, payload_json) VALUES (?, ?)
     ON CONFLICT(breed_id) DO UPDATE SET payload_json = excluded.payload_json`,
    details.id,
    JSON.stringify(details),
  );
}

async function insertGroups(
  database: SQLiteDatabase,
  groups: BreedGroup[],
): Promise<void> {
  for (const group of groups) {
    await database.runAsync(
      "INSERT INTO breed_groups (id, name) VALUES (?, ?)",
      group.id,
      group.name,
    );
  }
}

async function insertBreeds(
  database: SQLiteDatabase,
  breeds: Breed[],
  detailsById: ReadonlyMap<string, BreedDetails>,
  pageSize: number,
  availableGroupIds: ReadonlySet<string>,
): Promise<void> {
  for (const [index, breed] of breeds.entries()) {
    await database.runAsync(
      `INSERT INTO breeds (
        id, name, life_min, life_max, hypoallergenic, thumbnail_url,
        other_names_json, group_id, maximum_weight, coat_length, coat_type,
        social_traits_json, page_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      breed.id,
      breed.name,
      breed.lifeMin,
      breed.lifeMax,
      breed.hypoallergenic ? 1 : 0,
      breed.thumbnailUrl,
      JSON.stringify(breed.otherNames),
      breed.groupId && availableGroupIds.has(breed.groupId)
        ? breed.groupId
        : null,
      breed.maximumWeight,
      breed.coatLength,
      breed.coatType,
      breed.socialTraits ? JSON.stringify(breed.socialTraits) : null,
      Math.floor(index / pageSize) + 1,
    );
    const details = detailsById.get(breed.id);
    if (details) {
      await database.runAsync(
        "INSERT INTO breed_details (breed_id, payload_json) VALUES (?, ?)",
        breed.id,
        JSON.stringify(details),
      );
    }
  }
}

export async function replaceCachedCatalogue(
  snapshot: CatalogueSnapshot,
  pageSize: number,
): Promise<void> {
  const database = await getCatalogueDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM breed_details");
    await database.runAsync("DELETE FROM breeds");
    if (snapshot.groups !== null) {
      await database.runAsync("DELETE FROM breed_groups");
      await insertGroups(database, snapshot.groups);
    }

    const existingGroups = await database.getAllAsync<{ id: string }>(
      "SELECT id FROM breed_groups",
    );
    const groupIds = new Set(existingGroups.map((group) => group.id));
    const detailsById = new Map(
      snapshot.details.map((details) => [details.id, details]),
    );
    await insertBreeds(
      database,
      snapshot.breeds,
      detailsById,
      pageSize,
      groupIds,
    );
    await database.runAsync(
      `INSERT INTO sync_metadata (
        resource, last_successful_sync_at, total_records, total_pages,
        loaded_pages, is_complete
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(resource) DO UPDATE SET
        last_successful_sync_at = excluded.last_successful_sync_at,
        total_records = excluded.total_records,
        total_pages = excluded.total_pages,
        loaded_pages = excluded.loaded_pages,
        is_complete = excluded.is_complete`,
      "catalogue",
      snapshot.isComplete ? Date.now() : null,
      snapshot.totalRecords,
      snapshot.totalPages,
      snapshot.loadedPages,
      snapshot.isComplete ? 1 : 0,
    );
  });
}
