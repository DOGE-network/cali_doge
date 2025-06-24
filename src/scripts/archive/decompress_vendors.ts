import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { gunzip } from 'zlib';
import { promisify } from 'util';

// Setup __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VENDORS_JSON_PATH = path.join(__dirname, '../data/vendors.json');
const VENDORS_JSON_GZ_PATH = `${VENDORS_JSON_PATH}.gz`;

async function decompressVendorData(): Promise<void> {
  try {
    if (!fs.existsSync(VENDORS_JSON_GZ_PATH)) {
      console.error('Compressed vendors.json.gz file not found');
      process.exit(1);
    }

    const compressed = fs.readFileSync(VENDORS_JSON_GZ_PATH);
    const decompressed = await promisify(gunzip)(compressed);
    fs.writeFileSync(VENDORS_JSON_PATH, decompressed);
    console.log('Successfully decompressed vendors.json');
  } catch (error) {
    console.error('Error decompressing vendors.json:', error);
    process.exit(1);
  }
}

// Run decompression
decompressVendorData().catch(console.error); 