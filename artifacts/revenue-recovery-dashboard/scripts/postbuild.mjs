import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.resolve(__dirname, '..');
const distDir = path.join(dashboardDir, 'dist');
const localPublic = path.join(dashboardDir, 'public');
const rootPublic = path.resolve(dashboardDir, '..', '..', 'public');

console.log('postbuild: distDir =', distDir);
console.log('postbuild: localPublic =', localPublic);
console.log('postbuild: rootPublic =', rootPublic);

// Copy dist → public INSIDE the dashboard folder
// (works if Vercel Root Directory = artifacts/revenue-recovery-dashboard)
if (existsSync(localPublic)) rmSync(localPublic, { recursive: true });
cpSync(distDir, localPublic, { recursive: true });
console.log('✓ Copied dist → dashboard/public/');

// Copy dist → public at MONOREPO ROOT
// (works if Vercel Root Directory = blank/monorepo root)
try {
  if (existsSync(rootPublic)) rmSync(rootPublic, { recursive: true });
  cpSync(distDir, rootPublic, { recursive: true });
  console.log('✓ Copied dist → root/public/');
} catch (e) {
  console.log('⚠ Could not copy to root public/ —', e.message);
}
