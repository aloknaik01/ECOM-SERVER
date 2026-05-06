const fetch = require('node-fetch'); // or just use global fetch if node > 18
async function check() {
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/fetch/dashboard-stats");
    const json = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", json);
  } catch(e) {
    console.log(e);
  }
}
check();
