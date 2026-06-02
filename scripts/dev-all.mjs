import { spawn } from 'node:child_process';

const services = [
  ['@chengying/api', 'dev'],
  ['@chengying/web', 'dev'],
  ['@chengying/admin', 'dev'],
];

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : 'npm';

const children = services.map(([workspace, script]) => {
  const args = npmCli ? [npmCli, 'run', script, '-w', workspace] : ['run', script, '-w', workspace];
  return spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
});

const stopAll = () => {
  children.forEach((child) => child.kill());
};

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

children.forEach((child) => {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
});
