import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const preferred = ['server-kart', 'card-roguelike', 'soup', 'elevator'];
const discovered = readdirSync(path.join(root, 'games'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(path.join(root, 'games', entry.name, 'package.json')))
  .map(entry => entry.name);
const games = [...preferred.filter(name => discovered.includes(name)),
  ...discovered.filter(name => !preferred.includes(name)).sort()];
const action = process.argv[2];
if (!['install','build','check','test'].includes(action)) throw Error('Expected install, build, check, or test.');
if (!process.env.npm_execpath) throw Error('Run this helper through the npm scripts in package.json.');

for (const name of games) {
  const cwd = path.join(root,'games',name);
  if (!existsSync(path.join(cwd,'package.json'))) throw Error(`Missing game: ${name}`);
  const pkg = JSON.parse(readFileSync(path.join(cwd,'package.json'),'utf8'));
  const script = action === 'check' ? (pkg.scripts.typecheck ? 'typecheck' : 'check') : action;
  if (action !== 'install' && !pkg.scripts[script]) throw Error(`${name} has no ${script} script.`);
  console.log(`\n${name}: ${action}`);
  const args = action === 'install' ? ['ci'] : ['run',script];
  const result = spawnSync(process.execPath,[process.env.npm_execpath,...args],{cwd,stdio:'inherit',env:process.env});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
