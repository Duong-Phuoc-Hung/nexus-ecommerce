/**
 * Project Nexus - Cross-Platform Microservices Docker Build Script
 * Supports Windows, macOS, and Linux without external shell dependencies.
 *
 * Usage:
 *   node scripts/build-all-images.js [service-name]
 *   node scripts/build-all-images.js --tag v1.0.0 --registry my-registry
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const SERVICES = [
  'api-gateway',
  'user-service',
  'catalog-service',
  'commerce-service',
  'auction-service',
  'fulfillment-service',
  'notification-service',
];

const args = process.argv.slice(2);
const tagArgIndex = args.indexOf('--tag');
const tag = tagArgIndex !== -1 ? args[tagArgIndex + 1] : process.env.TAG || 'latest';

const registryArgIndex = args.indexOf('--registry');
const registry =
  registryArgIndex !== -1 ? args[registryArgIndex + 1] : process.env.REGISTRY || 'nexus';

// Check if a specific service is requested
const targetService = args.find((arg) => !arg.startsWith('--') && SERVICES.includes(arg));
const servicesToBuild = targetService ? [targetService] : SERVICES;

console.log('='.repeat(75));
console.log('🐳 PROJECT NEXUS - DOCKER BUILD TOOL');
console.log(`Target Registry: ${registry}`);
console.log(`Target Tag:      ${tag}`);
console.log(`Services to build: ${servicesToBuild.join(', ')}`);
console.log('='.repeat(75));

let successCount = 0;
let failCount = 0;

for (const service of servicesToBuild) {
  const dockerfilePath = `backend/${service}/Dockerfile`;
  const imageName = `${registry}/${service}`;
  const startTime = Date.now();

  console.log(`\n🔨 [${service}] Building Docker image...`);
  console.log(`   Dockerfile: ${dockerfilePath}`);
  console.log(`   Tags:       ${imageName}:${tag}, ${imageName}:latest`);

  const dockerArgs = [
    'build',
    '-f',
    dockerfilePath,
    '-t',
    `${imageName}:${tag}`,
    '-t',
    `${imageName}:latest`,
    '.',
  ];

  const result = spawnSync('docker', dockerArgs, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result.status === 0) {
    console.log(`✅ [${service}] Build succeeded in ${durationSec}s!`);
    successCount++;
  } else {
    console.error(
      `❌ [${service}] Build FAILED with exit code ${result.status} in ${durationSec}s.`,
    );
    failCount++;
  }
}

console.log('\n' + '='.repeat(75));
if (failCount === 0) {
  console.log(`🎉 All ${successCount} service image(s) built successfully!`);
} else {
  console.error(`⚠️ Completed with ${successCount} success(es) and ${failCount} failure(s).`);
  process.exit(1);
}
console.log('='.repeat(75));
