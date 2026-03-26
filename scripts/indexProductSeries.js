import { algoliasearch } from "algoliasearch";
import "dotenv/config";

const APP_ID = "XEN89OMQH5";
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

const SOURCE_INDEX = "prod_gems_products_EN_test";
const DEST_INDEX = "prod_gems_series_EN_test";
const FILTER = "productType:SKU";

if (!ADMIN_KEY) {
  console.error("Missing ALGOLIA_ADMIN_API_KEY");
  process.exit(1);
}

const client = algoliasearch(APP_ID, ADMIN_KEY);

async function fetchSkuRecords() {
  const records = [];

  await client.browseObjects({
    indexName: SOURCE_INDEX,
    browseParams: {
      filters: FILTER,
      hitsPerPage: 1000,
    },
    aggregator: (batch) => {
      records.push(...batch);
    },
  });

  return records;
}

async function deleteFromSource(objectIDs) {
  console.log(`🗑️ Deleting ${objectIDs.length} records from ${SOURCE_INDEX}...`);

  await client.deleteObjects({
    indexName: SOURCE_INDEX,
    objectIDs,
  });

  console.log("✅ Deletion complete.");
}

async function main() {
  console.log(`Browsing ${SOURCE_INDEX} for ${FILTER}...`);

  const records = await fetchSkuRecords();
  console.log(`Found ${records.length} records.`);

  if (records.length === 0) return;

  const objectIDs = records.map((r) => r.objectID);

  console.log(`📦 Indexing into ${DEST_INDEX}...`);

  await client.saveObjects({
    indexName: DEST_INDEX,
    objects: records,
  });

  console.log("✅ Indexing complete.");

  // 🚨 Only delete AFTER successful indexing
  await deleteFromSource(objectIDs);

  console.log("🎉 Move complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});