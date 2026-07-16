import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const LOCAL_DB_FILE = path.join(process.cwd(), "data-store.json");

async function migrate() {
  // Use explicit standard connection string to bypass Node SRV lookup issues
  const uri = "mongodb://prathamesh:SPagalave%403162@ac-zdomxop-shard-00-00.nxcub6i.mongodb.net:27017,ac-zdomxop-shard-00-01.nxcub6i.mongodb.net:27017,ac-zdomxop-shard-00-02.nxcub6i.mongodb.net:27017/?ssl=true&replicaSet=atlas-zdomxop-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
  const dbName = (process.env.DATABASE_NAME || "neighbourlink").replace(/^["']|["']$/g, "").trim();

  console.log(`Connecting to MongoDB directly bypassing SRV...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB successfully.");
    const db = client.db(dbName);

    // Read local data
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      console.log("No data-store.json found. Nothing to migrate.");
      return;
    }

    const data = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, "utf-8"));
    const collections = Object.keys(data);

    for (const collectionName of collections) {
      const docs = data[collectionName];
      if (Array.isArray(docs) && docs.length > 0) {
        console.log(`Migrating ${docs.length} documents to collection: ${collectionName}...`);
        const col = db.collection(collectionName);
        
        let inserted = 0;
        for (const doc of docs) {
            try {
                await col.insertOne(doc);
                inserted++;
            } catch (err: any) {
                if (err.code === 11000) {
                    // ignore duplicates
                } else {
                    console.error(`Error inserting document into ${collectionName}:`, err.message);
                }
            }
        }
        console.log(`Finished ${collectionName}: ${inserted} inserted.`);
      } else {
        console.log(`Skipping empty collection: ${collectionName}`);
      }
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

migrate();
