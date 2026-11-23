import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const release = 'release';
const name = `punkgun-${version}`;
const folder = `${release}/${name}`;
const archive = `${release}/${name}.tar.gz`;

rmSync(release, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });
cpSync('dist', folder, { recursive: true });

writeFileSync(
  `${folder}/BUILD.txt`,
  [
    `PUNKGUN ${version}`,
    `Built: ${new Date().toISOString()}`,
    'Target: static web / installable PWA',
    'Deploy: serve this directory from any static host with HTTPS',
    'Service worker scope: /',
    '',
  ].join('\n'),
);

try {
  execFileSync('tar', ['-czf', archive, '-C', release, name], { stdio: 'inherit' });
  const hash = createHash('sha256').update(readFileSync(archive)).digest('hex');
  writeFileSync(`${release}/SHA256SUMS.txt`, `${hash}  ${name}.tar.gz\n`);
} catch (error) {
  console.warn(`Tar archive skipped: ${error instanceof Error ? error.message : String(error)}`);
}

console.log(`Packaged ${folder}`);
console.log(`Archive ${archive}`);
