import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function migrateItemDetails() {
  const url = new URL(DATABASE_URL);
  const sslParam = url.searchParams.get("ssl");
  
  let connectionConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };

  if (sslParam) {
    try {
      const sslConfig = JSON.parse(sslParam);
      connectionConfig.ssl = sslConfig;
    } catch (e) {
      console.warn("Failed to parse SSL config:", e);
    }
  }

  const connection = await mysql.createConnection(connectionConfig);

  try {
    // Get all listings with descriptions but no itemDetails
    const [listings] = await connection.query(
      'SELECT id, description, category FROM listings WHERE itemDetails IS NULL OR itemDetails = "{}"'
    );

    console.log(`Found ${listings.length} listings to migrate`);

    for (const listing of listings) {
      const itemDetails = extractItemDetails(listing.description, listing.category);
      
      if (Object.keys(itemDetails).length > 0) {
        await connection.query(
          'UPDATE listings SET itemDetails = ? WHERE id = ?',
          [JSON.stringify(itemDetails), listing.id]
        );
        console.log(`Updated listing ${listing.id} with itemDetails:`, itemDetails);
      }
    }

    console.log('Migration complete!');
  } finally {
    await connection.end();
  }
}

function extractItemDetails(description, category) {
  const itemDetails = {};

  // Extract fields from description using regex patterns
  const patterns = {
    grading_company: /Grading Company:\s*([^\n]+)/i,
    certification_number: /Certification Number:\s*([^\n]+)/i,
    grade: /Grade:\s*([^\n]+)/i,
    pokemon: /pokemon:\s*([^\n]+)/i,
    set: /set:\s*([^\n]+)/i,
    rarity: /rarity:\s*([^\n]+)/i,
    additional_notes: /Additional Notes:\s*([^\n]+)/i,
    manufacturer: /manufacturer:\s*([^\n]+)/i,
    year: /year:\s*([^\n]+)/i,
    team: /team:\s*([^\n]+)/i,
    sport: /sport:\s*([^\n]+)/i,
    rookie: /rookie:\s*([^\n]+)/i,
    autographed: /autographed:\s*([^\n]+)/i,
    signed: /signed:\s*([^\n]+)/i,
    facsimile: /facsimile:\s*([^\n]+)/i,
    issue_number: /Issue Number:\s*([^\n]+)/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = description.match(pattern);
    if (match) {
      itemDetails[key] = match[1].trim();
    }
  }

  return itemDetails;
}

migrateItemDetails().catch(console.error);
