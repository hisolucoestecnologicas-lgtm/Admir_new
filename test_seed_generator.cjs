const fs = require('fs');
const path = require('path');

const team = JSON.parse(fs.readFileSync('scraped_team.json'));
const posts = JSON.parse(fs.readFileSync('scraped_posts.json'));

console.log("Team count:", team.length);
console.log("Posts count:", posts.length);
