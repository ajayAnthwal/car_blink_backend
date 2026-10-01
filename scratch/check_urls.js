const http = require('http');

const urls = [
  'http://localhost:3000',
  'http://localhost:3000/register',
  'http://localhost:3000/login',
  'http://localhost:3000/partner-login',
  'http://localhost:3000/for-workshops',
  'http://localhost:3000/services',
  'http://localhost:3000/quotes',
  'http://localhost:3001/login',
  'http://localhost:8000/api'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function run() {
  const results = [];
  for (const url of urls) {
    results.push(await checkUrl(url));
  }
  console.table(results);
}

run();
