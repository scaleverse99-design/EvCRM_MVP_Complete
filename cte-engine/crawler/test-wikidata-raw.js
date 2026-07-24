async function test() {
  const qid = 'Q111190559'; // Ather 450x
  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const res = await fetch(entityUrl);
  const data = await res.json();
  const entity = data.entities[qid];
  
  console.log('Label:', entity.labels.en?.value);
  console.log('Description:', entity.descriptions.en?.value);
  
  // Print some claim properties
  console.log('Claims properties keys:', Object.keys(entity.claims));
}
test();
