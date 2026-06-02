import { spawn } from 'node:child_process';

const [workspace, script, ...extraArgs] = process.argv.slice(2);

if (!workspace || !script) {
  console.error('Usage: node scripts/run-workspace.mjs <workspace> <script> [...args]');
  process.exit(1);
}

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : 'npm';
const args = npmCli ? [npmCli, 'run', script, '-w', workspace, ...extraArgs] : ['run', script, '-w', workspace, ...extraArgs];

const child = spawn(command, args, {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
