#!/bin/sh
set -e

echo "=== Waiting for MongoDB ==="
sleep 3

echo "=== Checking database ==="
NEED_CRAWL=$(node -e "
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lol_agent');
    const db = mongoose.connection.db;
    const c = await db.collection('champions').countDocuments();
    const h = await db.collection('hextechaugments').countDocuments();
    const i = await db.collection('championhexteches').countDocuments();
    await mongoose.disconnect();
    console.log(c === 0 || h === 0 || i === 0 ? 'yes' : 'no');
  } catch(e) {
    console.log('yes');
  }
})();
" 2>/dev/null)

if [ "$NEED_CRAWL" = "yes" ]; then
  echo "=== Database empty, running crawlers ==="
  node dist/db/crawlChampions.js
  node dist/db/crawlHextech.js
  node dist/db/crawlChampionHextech.js
  echo "=== Crawl complete ==="
else
  echo "=== Database already populated, skipping crawl ==="
fi

echo "=== Starting backend server ==="
exec node dist/index.js
