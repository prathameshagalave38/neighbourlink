import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

let client: MongoClient | null = null;

// Local fallback JSON file path (persisted across restarts)
const LOCAL_DB_FILE = path.join(process.cwd(), "data-store.json");

// Define structure of local database
interface LocalStoreSchema {
  [key: string]: any[];
}

const defaultStore: LocalStoreSchema = {
  users: [],
  societies: [],
  buildings: [],
  flats: [],
  residents: [],
  complaints: [],
  visitors: [],
  parking_slots: [],
  vehicles: [],
  maintenance_plans: [],
  maintenance_bills: [],
  payments: [],
  receipts: [],
  notices: [],
  notifications: [],
  audit_logs: []
};

// Initialize local DB if it does not exist
function initLocalDb() {
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

// Read database from file
function readLocalDb(): LocalStoreSchema {
  initLocalDb();
  try {
    const content = fs.readFileSync(LOCAL_DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Failed to parse data-store.json. Resetting storage.", err);
    return defaultStore;
  }
}

// Write database to file
function writeLocalDb(data: LocalStoreSchema) {
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to data-store.json", err);
  }
}

// Exported Db Client Wrapper Interface
export interface DbCollectionWrapper {
  find: (query?: any) => Promise<any[]>;
  findOne: (query: any) => Promise<any | null>;
  insertOne: (doc: any) => Promise<{ insertedId: string }>;
  insertMany: (docs: any[]) => Promise<void>;
  updateOne: (query: any, update: any) => Promise<{ modifiedCount: number }>;
  updateMany: (query: any, update: any) => Promise<{ modifiedCount: number }>;
  deleteOne: (query: any) => Promise<{ deletedCount: number }>;
  deleteMany: (query: any) => Promise<{ deletedCount: number }>;
  aggregate: (pipeline: any[]) => Promise<any[]>;
  countDocuments: (query?: any) => Promise<number>;
}

export interface DbInstanceWrapper {
  collection: (name: string) => DbCollectionWrapper;
  isAtlas: boolean;
}

/**
 * Returns active database connection instance (MongoDB Atlas or Local fallback)
 */
export async function getDb(): Promise<DbInstanceWrapper> {
  let uri = process.env.MONGODB_URI;
  let dbName = process.env.DATABASE_NAME || "neighbourlink";

  // Clean surrounding quotes if present in env variables
  if (uri) {
    uri = uri.replace(/^["']|["']$/g, "").trim();
  }
  if (dbName) {
    dbName = dbName.replace(/^["']|["']$/g, "").trim();
  }

  // Determine if we have a valid, configured non-placeholder URI
  const isValidUri = uri &&
    (uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://")) &&
    !uri.includes("user:pass") &&
    !uri.includes("cluster.mongodb.net") &&
    uri !== "undefined" &&
    uri !== "null" &&
    !uri.includes("<") &&
    !uri.includes("placeholder");

  if (isValidUri) {
    try {
      if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        console.log("Connected to MongoDB Atlas successfully.");
      }
      const atlasDb = client.db(dbName);
      
      const convertId = (query: any): any => {
        if (!query) return query;
        const newQuery = { ...query };
        if (newQuery._id) {
          if (typeof newQuery._id === "string" && ObjectId.isValid(newQuery._id)) {
            try {
              newQuery._id = new ObjectId(newQuery._id);
            } catch (e) {
              // ignore
            }
          } else if (typeof newQuery._id === "object") {
            if (newQuery._id.$in && Array.isArray(newQuery._id.$in)) {
              newQuery._id.$in = newQuery._id.$in.map((id: any) => {
                if (typeof id === "string" && ObjectId.isValid(id)) {
                  try {
                    return new ObjectId(id);
                  } catch (e) {
                    return id;
                  }
                }
                return id;
              });
            }
          }
        }
        return newQuery;
      };

      const mapDoc = (doc: any): any => {
        if (!doc) return doc;
        return {
          ...doc,
          _id: doc._id ? doc._id.toString() : doc._id
        };
      };

      return {
        collection: (name: string): DbCollectionWrapper => {
          const col = atlasDb.collection(name);
          return {
            find: async (query: any = {}) => {
              const res = await col.find(convertId(query)).toArray();
              return res.map(mapDoc);
            },
            findOne: async (query: any) => {
              const res = await col.findOne(convertId(query));
              return mapDoc(res);
            },
            insertOne: async (doc: any) => {
              const cleanedDoc = { ...doc };
              const res = await col.insertOne({
                ...cleanedDoc,
                createdAt: cleanedDoc.createdAt || new Date().toISOString(),
                updatedAt: cleanedDoc.updatedAt || new Date().toISOString()
              });
              return { insertedId: res.insertedId.toString() };
            },
            insertMany: async (docs: any[]) => {
              const cleanedDocs = docs.map(doc => ({
                ...doc,
                createdAt: doc.createdAt || new Date().toISOString(),
                updatedAt: doc.updatedAt || new Date().toISOString()
              }));
              await col.insertMany(cleanedDocs);
            },
            updateOne: async (query: any, update: any) => {
              const res = await col.updateOne(convertId(query), update);
              return { modifiedCount: res.modifiedCount };
            },
            updateMany: async (query: any, update: any) => {
              const res = await col.updateMany(convertId(query), update);
              return { modifiedCount: res.modifiedCount };
            },
            deleteOne: async (query: any) => {
              const res = await col.deleteOne(convertId(query));
              return { deletedCount: res.deletedCount };
            },
            deleteMany: async (query: any) => {
              const res = await col.deleteMany(convertId(query));
              return { deletedCount: res.deletedCount };
            },
            aggregate: async (pipeline: any[]) => {
              const res = await col.aggregate(pipeline).toArray();
              return res.map(mapDoc);
            },
            countDocuments: async (query: any = {}) => {
              return col.countDocuments(convertId(query));
            },
          };
        },
        isAtlas: true,
      };
    } catch (err: any) {
      console.log(`Database fallback activated: MongoDB Atlas connection was unconfigured or unsuccessful (Message: ${err?.message || err}).`);
    }
  }

  // Local file fallback
  initLocalDb();
  return {
    collection: (name: string): DbCollectionWrapper => {
      return {
        find: async (query: any = {}) => {
          const data = readLocalDb();
          const list = data[name] || [];
          return list.filter((item: any) => {
            for (const key in query) {
              if (item[key] !== query[key]) return false;
            }
            return true;
          });
        },
        findOne: async (query: any) => {
          const data = readLocalDb();
          const list = data[name] || [];
          const matched = list.find((item: any) => {
            for (const key in query) {
              if (item[key] !== query[key]) return false;
            }
            return true;
          });
          return matched || null;
        },
        insertOne: async (doc: any) => {
          const data = readLocalDb();
          if (!data[name]) data[name] = [];
          const newDoc = {
            _id: doc._id || Math.random().toString(36).substr(2, 9),
            ...doc,
            createdAt: doc.createdAt || new Date().toISOString(),
            updatedAt: doc.updatedAt || new Date().toISOString()
          };
          data[name].push(newDoc);
          writeLocalDb(data);
          return { insertedId: newDoc._id };
        },
        insertMany: async (docs: any[]) => {
          const data = readLocalDb();
          if (!data[name]) data[name] = [];
          docs.forEach((doc) => {
            const newDoc = {
              _id: doc._id || Math.random().toString(36).substr(2, 9),
              ...doc,
              createdAt: doc.createdAt || new Date().toISOString(),
              updatedAt: doc.updatedAt || new Date().toISOString()
            };
            data[name].push(newDoc);
          });
          writeLocalDb(data);
        },
        updateOne: async (query: any, update: any) => {
          const data = readLocalDb();
          const list = data[name] || [];
          let modifiedCount = 0;
          list.forEach((item: any, idx: number) => {
            let match = true;
            for (const key in query) {
              if (item[key] !== query[key]) match = false;
            }
            if (match) {
              const setFields = update.$set || {};
              const unsetFields = update.$unset || {};
              list[idx] = { ...item, ...setFields, updatedAt: new Date().toISOString() };
              for (const key in unsetFields) {
                delete list[idx][key];
              }
              modifiedCount++;
            }
          });
          data[name] = list;
          writeLocalDb(data);
          return { modifiedCount };
        },
        updateMany: async (query: any, update: any) => {
          const data = readLocalDb();
          const list = data[name] || [];
          let modifiedCount = 0;
          list.forEach((item: any, idx: number) => {
            let match = true;
            for (const key in query) {
              if (item[key] !== query[key]) match = false;
            }
            if (match) {
              const setFields = update.$set || {};
              list[idx] = { ...item, ...setFields, updatedAt: new Date().toISOString() };
              modifiedCount++;
            }
          });
          data[name] = list;
          writeLocalDb(data);
          return { modifiedCount };
        },
        deleteOne: async (query: any) => {
          const data = readLocalDb();
          const list = data[name] || [];
          const initialLength = list.length;
          const remaining = list.filter((item: any) => {
            let match = true;
            for (const key in query) {
              if (item[key] !== query[key]) match = false;
            }
            return !match;
          });
          data[name] = remaining;
          writeLocalDb(data);
          return { deletedCount: initialLength - remaining.length };
        },
        deleteMany: async (query: any) => {
          const data = readLocalDb();
          const list = data[name] || [];
          const initialLength = list.length;
          const remaining = list.filter((item: any) => {
            let match = true;
            for (const key in query) {
              if (item[key] !== query[key]) match = false;
            }
            return !match;
          });
          data[name] = remaining;
          writeLocalDb(data);
          return { deletedCount: initialLength - remaining.length };
        },
        aggregate: async (pipeline: any[]) => {
          // General dashboard helpers
          const data = readLocalDb();
          const list = data[name] || [];
          return list;
        },
        countDocuments: async (query: any = {}) => {
          const data = readLocalDb();
          const list = data[name] || [];
          const filtered = list.filter((item: any) => {
            for (const key in query) {
              if (item[key] !== query[key]) return false;
            }
            return true;
          });
          return filtered.length;
        }
      };
    },
    isAtlas: false,
  };
}
