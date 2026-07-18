const axios = require('axios');
const sodium = require('libsodium-wrappers');

const TOKEN = 'YOUR_GITHUB_TOKEN_HERE';
const USERNAME = 'Kurapati-Sai-Suhas';
const REPO_NAME = 'Kurapati-Sai-Suhas';

const api = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

async function main() {
  try {
    console.log(`Checking if repository ${USERNAME}/${REPO_NAME} exists...`);
    try {
      await api.get(`/repos/${USERNAME}/${REPO_NAME}`);
      console.log('Repository already exists.');
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.log('Creating repository...');
        await api.post('/user/repos', {
          name: REPO_NAME,
          description: 'My Interactive Cricket Profile README',
          private: false,
          auto_init: false,
        });
        console.log('Repository created successfully.');
      } else {
        throw e;
      }
    }

    console.log('Fetching repository public key...');
    const { data: keyData } = await api.get(`/repos/${USERNAME}/${REPO_NAME}/actions/secrets/public-key`);
    
    console.log('Encrypting secret...');
    await sodium.ready;
    const binkey = sodium.from_base64(keyData.key, sodium.base64_variants.ORIGINAL);
    const binsec = sodium.from_string(TOKEN);
    const encBytes = sodium.crypto_box_seal(binsec, binkey);
    const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

    console.log('Setting repository secret GH_PAT...');
    await api.put(`/repos/${USERNAME}/${REPO_NAME}/actions/secrets/GH_PAT`, {
      encrypted_value: encryptedValue,
      key_id: keyData.key_id,
    });
    console.log('Secret set successfully.');
    
  } catch (error) {
    console.error('An error occurred:', error.response ? error.response.data : error.message);
  }
}

main();
