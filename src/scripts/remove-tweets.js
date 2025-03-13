const fs = require('fs');
const path = require('path');
const tweetsFile = path.join('src/data/tweets/tweets.json');

// Read the current tweets data
const data = JSON.parse(fs.readFileSync(tweetsFile, 'utf8'));

// IDs of the 6 most recent tweets to remove
const tweetsToRemove = [
  '1900197564714279267',
  '1900197563359429061',
  '1900197561954382166',
  '1900197560532541687',
  '1900197559135854886',
  '1900197557747462300'
];

// Filter out the tweets to remove
const filteredTweets = data.tweets.filter(tweet => !tweetsToRemove.includes(tweet.id));

// Find the new newest tweet ID
const newNewestId = filteredTweets.length > 0 ? filteredTweets[0].id : '';
const oldestId = data.meta.oldest_id;

// Update the data
const updatedData = {
  ...data,
  tweets: filteredTweets,
  meta: {
    result_count: filteredTweets.length,
    newest_id: newNewestId,
    oldest_id: oldestId
  }
};

// Write the updated data back to the file
fs.writeFileSync(tweetsFile, JSON.stringify(updatedData, null, 2));

console.log('Removed 6 most recent tweets.');
console.log('New tweet count:', filteredTweets.length);
console.log('New newest_id:', newNewestId); 