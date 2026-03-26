import "dotenv/config";
import { algoliasearch } from "algoliasearch";

const APP_ID = "XEN89OMQH5";
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

const SOURCE_INDEX = "prod_gems_products_EN_test";
const DEST_INDEX = "prod_gems_series_EN_test";
const FILTER = "productType:Series";

if (!ADMIN_KEY) {
  console.error("Missing ALGOLIA_ADMIN_API_KEY");
  process.exit(1);
}

const client = algoliasearch(APP_ID, ADMIN_KEY);

async function fetchSeriesRecords() {
  const records = [];

  await client.browseObjects({
    indexName: SOURCE_INDEX,
    browseParams: {
      filters: FILTER,
      hitsPerPage: 1000,
    },
    aggregator: (res) => {
      records.push(...res.hits);
    },
  });

  return records;
}

async function main() {
  console.log(`Browsing ${SOURCE_INDEX} for ${FILTER}...`);

  const records = await fetchSeriesRecords();
  console.log(`Found ${records.length} records.`);

  if (records.length === 0) {
    console.log("Nothing to move.");
    return;
  }

  console.log(`Saving ${records.length} records to ${DEST_INDEX}...`);
  const saveResponse = await client.saveObjects({
    indexName: DEST_INDEX,
    objects: records,
  });

  console.log("Save complete.");
  console.log(saveResponse);

  // Leave deletion OFF until you confirm the records are in the new index.
  const objectIDs = records.map((r) => r.objectID);
  await client.deleteObjects({
    indexName: SOURCE_INDEX,
    objectIDs,
  });
  console.log("Delete complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});