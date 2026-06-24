const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function listModels() {
  const key = 'AIzaSyAqJ7wd0crPXZwRE3cJUtXk3StMFm_6lms';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

listModels();
