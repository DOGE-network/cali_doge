#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ensure badges directory exists
const badgesDir = path.join(__dirname, 'public/badges');
if (!fs.existsSync(badgesDir)) {
  fs.mkdirSync(badgesDir, { recursive: true });
}

// Get package.json info
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

// Calculate data metrics
function getDataMetrics() {
  const dataDir = path.join(__dirname, '../data');
  let totalDataRows = 0;
  
  // Define specific directories to count
  const countDirectories = [
    path.join(dataDir, 'budget/text'),
    path.join(dataDir, 'vendors'),
    path.join(dataDir, 'workforce')
  ];
  
  countDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true });
      files.forEach(file => {
        if (file.endsWith('.txt') || file.endsWith('.csv')) {
          const filePath = path.join(dir, file);
          try {
            // Count lines (data rows)
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').length;
            totalDataRows += lines;
          } catch (error) {
            console.warn(`Could not read file: ${filePath}`);
          }
        }
      });
    }
  });
  
  return {
    dataRows: formatNumber(totalDataRows)
  };
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Generate badge using badge-maker
async function generateBadge(format) {
  try {
    const { makeBadge } = await import('badge-maker');
    return makeBadge(format);
  } catch (error) {
    console.error(`Error generating badge for ${format.label}:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  // Generate badges
  const metrics = getDataMetrics();

  const badgeConfigs = [
    {
      label: 'version',
      message: packageJson.version,
      color: 'blue',
      style: 'flat'
    },
    {
      label: 'node',
      message: '18+',
      color: 'green',
      style: 'flat'
    },
    {
      label: 'typescript',
      message: '5.3.3',
      color: 'blue',
      style: 'flat'
    },
    {
      label: 'next.js',
      message: '15.3.3',
      color: 'black',
      style: 'flat'
    },
    {
      label: 'license',
      message: 'CC-BY',
      color: 'blue',
      style: 'flat'
    },
    {
      label: 'license',
      message: 'Apache 2.0',
      color: 'blue',
      style: 'flat'
    },
    {
      label: 'data rows',
      message: metrics.dataRows,
      color: 'green',
      style: 'flat'
    },
    {
      label: 'coverage',
      message: '30%',
      color: 'yellow',
      style: 'flat'
    },
    {
      label: 'build',
      message: 'passing',
      color: 'green',
      style: 'flat'
    }
  ];

  // Generate badges and save SVGs
  const badges = {};
  for (const config of badgeConfigs) {
    const svg = await generateBadge(config);
    if (svg) {
      // Create a unique key for the badge
      const key = config.label === 'license' && config.message === 'Apache 2.0' ? 'licenseApache' : config.label;
      const filename = `${key.replace(/\s+/g, '-')}.svg`;
      const filepath = path.join(badgesDir, filename);
      
      // Save SVG file
      fs.writeFileSync(filepath, svg);
      
      // Store reference in badges.json
      badges[key] = `./badges/${filename}`;
      
      console.log(`✅ Generated badge: ${filename}`);
    }
  }

  // Write badges metadata to file
  const badgesFile = path.join(badgesDir, 'badges.json');
  fs.writeFileSync(badgesFile, JSON.stringify(badges, null, 2));

  console.log('✅ Badges generated successfully!');
  console.log(`📊 Data rows: ${metrics.dataRows}`);
  console.log(`📝 Badges saved to: ${badgesDir}`);
  console.log(`📄 Metadata saved to: ${badgesFile}`);
}

// Run the main function
main().catch(console.error); 