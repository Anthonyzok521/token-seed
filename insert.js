import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { issueToken } from './mnemonic-token.js';
import { config } from 'dotenv';
import ccolor from 'ccolor';

// Load environment variables from .env file
config();

let isSuccess = false;

// Convert exec into a promise-based function
const execPromise = promisify(exec);

const runCommand = async () => {
console.log(ccolor.blue("INITIATING COMMAND EXECUTION"));
const { token, hash } = issueToken(128);
const path = `~/._tmp/.ew/.w/${hash}`;
console.log('TABLE:');
console.table({
  token: token,
  hash: hash
});

try {
    const { stdout, stderr } = await execPromise(`mkdir ${path}; ${process.env.COMMAND} "p2pkh:bip39:${token}" -w ${path}/${token.split(' ')[0]}`);
    console.log(ccolor.green('STDOUT:'), stdout);
    if (stderr) {
      console.error(ccolor.red('[x]'), stderr);
    }
    isSuccess = true;
    return;
  } catch (error) {
    if(error.message.includes('Seed or key not recognized')) {
        console.error(ccolor.red('[x] Seed or key not recognized... Please check the provided token.'));
        const { stdout, stderr } = await execPromise(`rm -rf ${path}`);
    }else{
        console.error(ccolor.red(`Execution Error: ${error.message}`));
    }
  }
console.log(ccolor.yellow("COMMAND EXECUTION STOPPED"));
}

setInterval(() => {
  if (!isSuccess) {
    runCommand();
  }
  console.log(ccolor.cyan("######################## Waiting for the next execution attempt...#########################"));
}, 5000); // Check every 5 seconds