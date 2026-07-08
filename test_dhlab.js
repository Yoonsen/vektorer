import fetch from 'node-fetch';

async function run() {
  const urns = ["URN:NBN:no-nb_digibok_2008051404065"];
  const params = {
    urn: urns,
    word: "arbeid",
    before: 5,
    after: 5,
    samplesize: 200000
  };
  
  const res = await fetch('https://api.nb.no/dhlab/urncolldist_urn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  const text = await res.text();
  // It seems the API returns a raw JSON string like "{\"word1\": 1.5, ...}" or a JSON encoded JSON string.
  console.log("Raw output length:", text.length);
  
  try {
    const parsed1 = JSON.parse(text);
    if (typeof parsed1 === 'string') {
       const parsed2 = JSON.parse(parsed1);
       console.log("Keys:", Object.keys(parsed2).slice(0, 10));
       console.log("Values for first key:", parsed2[Object.keys(parsed2)[0]]);
    } else {
       console.log("Keys:", Object.keys(parsed1).slice(0, 10));
       console.log("Values for first key:", parsed1[Object.keys(parsed1)[0]]);
    }
  } catch (e) {
    console.error("Parse error:", e);
  }
}
run();
