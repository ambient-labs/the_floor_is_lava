import { spawn, } from 'child_process';
import { getLogLevel, verbose, } from './logger.js';
import { exists, } from './fs.js';

interface STD {
  stdout?: (data: string) => void;
  stderr?: (data: string) => void;
}

const parseCommand = (_command: string | string[]) => {
  const command = Array.isArray(_command) ? _command : _command.split(' ');
  if (command[0] === 'npm' || command[0] === 'pnpm') {
    return command.slice(1);
  }
  return command;
};

export const runPackageCommand = (
  command: string | string[],
  cwd: string,
  runner: 'npm' | 'pnpm',
  {
    stdout,
    stderr,
  }: STD = {},
) => new Promise<void>((resolve, reject) => {
  const stdoutChunks: Uint8Array[] = [];
  const stderrChunks: Uint8Array[] = [];

  const child = spawn(runner, parseCommand(command), {
    shell: true,
    cwd,
    stdio: ["inherit", 'pipe', 'pipe',],
  });

  child.on('error', reject);

  child.stdout.on('data', (data: Uint8Array) => {
    stdoutChunks.push(data);
  });
  child.stdout.on('end', () => {
    if (stdout) {
      stdout(Buffer.concat(stdoutChunks).toString());
    }
  });

  child.stderr.on('data', (data: Uint8Array) => {
    stderrChunks.push(data);
  });
  child.stderr.on('end', () => {
    if (stderr) {
      stderr(Buffer.concat(stderrChunks).toString());
    }
  });

  child.on('close', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(code);
    }
  });
});


export const npmInstall = async (cwd: string, {
  isSilent = false,
  registryURL,
}: InstallPackagesOptsNPM = {}) => {
  if (!(await exists(cwd))) {
    throw new Error(`Directory does not exist: ${cwd}`);
  }
  const logLevel = getLogLevel();
  const command = [
    'npm',
    'install',
    isSilent ? '--silent' : '',
    '--no-fund',
    '--no-audit',
    '--no-package-lock',
    '--loglevel',
    logLevel,
    registryURL ? `--registry ${registryURL}` : '',
  ].filter(Boolean);
  verbose(`${command.join(' ')} in ${cwd}`);
  await runPackageCommand(command, cwd, 'npm',);
};

export const pnpmInstall = async (cwd: string, {
  isSilent = false,
}: InstallPackagesOptsPNPM = {}) => {
  if (!(await exists(cwd))) {
    throw new Error(`Directory does not exist: ${cwd}`);
  }
  // const logLevel = getLogLevel();
  const command = [
    'pnpm',
    'install',
    '--ignore-scripts',
    '--fix-lockfile',
    isSilent ? '--silent' : '',
    // '--no-fund',
    // '--no-audit',
    // '--no-package-lock',
    // '--loglevel',
    // logLevel,
    // registryURL ? `--registry ${registryURL}` : '',
  ].filter(Boolean);
  verbose(`${command.join(' ')} in ${cwd}`);
  await runPackageCommand(command, cwd, 'pnpm');

};

export type PackageManager = 'pnpm' | 'npm';
interface InstallPackagesOptsPNPM {
  isSilent?: boolean;
}
interface InstallPackagesOptsNPM {
  isSilent?: boolean;
  registryURL?: string;
}
type InstallPackagesOpts = InstallPackagesOptsPNPM | InstallPackagesOptsNPM;

export async function installPackages(cwd: string, {
  packageManager,
  ...opts
}: InstallPackagesOpts & { packageManager?: PackageManager } = {}) {
  if (packageManager === 'npm') {
    await npmInstall(cwd, opts);
  } else {
    await pnpmInstall(cwd, opts);
  }
};

export const runPNPMCommand = (
  command: Parameters<typeof runPackageCommand>[0],
  cwd: Parameters<typeof runPackageCommand>[1],
  std: Parameters<typeof runPackageCommand>[3],
) => runPackageCommand(command, cwd, 'pnpm', std);
