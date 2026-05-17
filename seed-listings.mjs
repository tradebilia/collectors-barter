import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Sample listings data for each category
const sampleListings = [
  {
    title: "Amazing Fantasy #15 (1962 Reprint)",
    category: "comics",
    condition: "near_mint",
    description: "Classic Spider-Man debut issue in excellent condition. Graded CGC 8.5. Perfect for serious collectors."
  },
  {
    title: "Action Comics #1 Facsimile Edition",
    category: "comics",
    condition: "mint",
    description: "Limited edition facsimile of Superman's first appearance. Sealed in original packaging."
  },
  {
    title: "X-Men #1 First Edition",
    category: "comics",
    condition: "very_good",
    description: "Original 1963 first appearance of the X-Men. Some wear but great eye appeal."
  },
  {
    title: "1986 Fleer Michael Jordan Rookie Card",
    category: "sports_cards",
    condition: "near_mint",
    description: "PSA 8 graded. The most iconic basketball card ever made. Excellent investment piece."
  },
  {
    title: "1952 Topps Mickey Mantle",
    category: "sports_cards",
    condition: "good",
    description: "Vintage baseball legend. SGC graded. Significant wear but authentic and collectible."
  },
  {
    title: "1990 Leaf Frank Thomas Rookie",
    category: "sports_cards",
    condition: "mint",
    description: "BGS 9 graded. The Big Hurt's rookie card in pristine condition."
  },
  {
    title: "Vintage Star Wars Figures Collection",
    category: "vintage_toys",
    condition: "very_good",
    description: "Lot of 5 original 1977-1983 figures with original packaging. Luke, Leia, Han, Vader, Yoda."
  },
  {
    title: "Original Barbie #1 Doll",
    category: "vintage_toys",
    condition: "good",
    description: "Rare first edition Barbie with original box. Some fading but complete."
  },
  {
    title: "G.I. Joe Cobra Commander Figure",
    category: "vintage_toys",
    condition: "near_mint",
    description: "AFA 85 graded. Complete with original accessories and paperwork."
  },
  {
    title: "Nintendo NES Console (Original)",
    category: "video_games",
    condition: "very_good",
    description: "Working original 1985 console with controllers and cables. Cosmetic wear only."
  },
  {
    title: "The Legend of Zelda (Gold Cartridge)",
    category: "video_games",
    condition: "near_mint",
    description: "WATA 8.5 graded. Sealed in original packaging. Highly sought after."
  },
  {
    title: "Super Mario Bros. 3 (CIB)",
    category: "video_games",
    condition: "mint",
    description: "Complete in box with all inserts. Pristine condition. Collector's dream."
  },
  {
    title: "1918 Inverted Jenny Stamp",
    category: "stamps",
    condition: "very_good",
    description: "Rare airmail stamp with inverted airplane design. PSE graded. One of the most valuable stamps."
  },
  {
    title: "British Penny Black (1840)",
    category: "stamps",
    condition: "good",
    description: "World's first adhesive postage stamp. Historic piece with original gum."
  },
  {
    title: "US First Day Cover Collection",
    category: "stamps",
    condition: "mint",
    description: "Set of 10 rare first day covers from the 1950s-60s. Complete and pristine."
  },
  {
    title: "1794 Flowing Hair Dollar",
    category: "coins",
    condition: "very_good",
    description: "PCGS graded. Iconic early American coin. Significant historical value."
  },
  {
    title: "1933 Double Eagle Gold Coin",
    category: "coins",
    condition: "near_mint",
    description: "NGC graded MS-62. Rare and valuable. One of only a few known specimens."
  },
  {
    title: "Morgan Dollar Collection (1878-1921)",
    category: "coins",
    condition: "good",
    description: "Complete set of 20 Morgan dollars in original album. Mixed grades but complete."
  },
  {
    title: "Charizard Holo Base Set (PSA 9)",
    category: "pokemon",
    condition: "near_mint",
    description: "The most iconic Pokemon card. PSA graded 9. Excellent centering and color."
  },
  {
    title: "Blastoise Holo Base Set",
    category: "pokemon",
    condition: "very_good",
    description: "BGS graded 7. Great example of this classic water-type card."
  },
  {
    title: "Pikachu Illustrator Card",
    category: "pokemon",
    condition: "mint",
    description: "Ultra-rare promotional card. CGC graded 10. One of the most valuable Pokemon cards."
  },
  {
    title: "Star Wars Original Trilogy Poster Set",
    category: "movies",
    condition: "very_good",
    description: "Authentic 1977-1983 theatrical posters. Rolled, never framed. Excellent condition."
  },
  {
    title: "Jaws Original Movie Poster",
    category: "movies",
    condition: "good",
    description: "1975 original release poster. PSA graded. Some wear but iconic design intact."
  },
  {
    title: "The Wizard of Oz Lobby Card Set",
    category: "movies",
    condition: "near_mint",
    description: "Complete set of 8 original lobby cards from 1939. Rare and highly collectible."
  },
  {
    title: "Muhammad Ali Signed Boxing Glove",
    category: "autographs",
    condition: "mint",
    description: "JSA authenticated. Official boxing glove signed by The Greatest. Certificate included."
  },
  {
    title: "Marilyn Monroe Signed Photo",
    category: "autographs",
    condition: "very_good",
    description: "PSA/DNA graded. Authentic signature on 8x10 glossy. Historic Hollywood memorabilia."
  },
  {
    title: "Stan Lee Signed Comic Book",
    category: "autographs",
    condition: "near_mint",
    description: "BAS authenticated. Signed Amazing Spider-Man #1 reprint. Perfect for Marvel fans."
  },
  {
    title: "Disneyland Opening Day Commemorative Pin",
    category: "disney_pins",
    condition: "mint",
    description: "LE 500 from 1955 opening. Rare and valuable. Original packaging included."
  },
  {
    title: "Disney Character Pin Collection",
    category: "disney_pins",
    condition: "near_mint",
    description: "Set of 12 limited edition character pins from D23 Expo. Complete with display case."
  },
  {
    title: "Cinderella Castle 50th Anniversary Pin",
    category: "disney_pins",
    condition: "mint",
    description: "LE 1000 exclusive. Pristine condition. Highly sought by pin traders."
  }
];

// Get all users from the database
const [users] = await connection.execute('SELECT id FROM users LIMIT 3');

if (users.length === 0) {
  console.log('No users found in database. Please create a user first.');
  await connection.end();
  process.exit(1);
}

console.log(`Found ${users.length} users. Creating sample listings...`);

// Insert listings
let count = 0;
for (const listing of sampleListings) {
  const userId = users[count % users.length].id;
  
  try {
    await connection.execute(
      'INSERT INTO listings (ownerId, title, category, condition, description, status, featured, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [userId, listing.title, listing.category, listing.condition, listing.description, 'active', false]
    );
    count++;
  } catch (error) {
    console.error(`Error inserting listing "${listing.title}":`, error.message);
  }
}

console.log(`Successfully created ${count} sample listings.`);
await connection.end();
