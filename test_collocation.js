const fetch = require('node-fetch');

async function testCollocation() {
  const urns = ["URN:NBN:no-nb_digibok_2008051404065"]; // Just a random book
  try {
    const res = await fetch('https://api.nb.no/dhlab/urncolldist_urn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urn: "URN:NBN:no-nb_digibok_2008051404065",
        word: "og",
        before: 5,
        after: 5
      })
    });
    console.log("urncolldist_urn status:", res.status);
    console.log(await res.text());
  } catch (e) { console.error(e); }
  
  try {
    const res2 = await fetch('https://api.nb.no/dhlab/collocation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpus: urns,
        words: ["kjærlighet"]
      })
    });
    console.log("collocation status:", res2.status);
    console.log(await res2.text());
  } catch (e) { console.error(e); }
}

testCollocation();
