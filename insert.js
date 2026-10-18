import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { issueToken } from './mnemonic-token.js';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

let isSuccess = false;

// Convert exec into a promise-based function
const execPromise = promisify(exec);

const runCommand = async () => {
console.log("INITIATING COMMAND EXECUTION");
const { token, hash } = issueToken(128);
const path = `~/._tmp/.ew/.w/${hash}`;
console.log('TABLE:');
console.table({
  token: token,
  hash: hash
});

try {
    const { stdout, stderr } = await execPromise(`mkdir ${path}; ${process.env.COMMAND} "p2pkh:bip39:${token}" -w ${path}/${token.split(' ')[0]}`);
    console.log('STDOUT:', stdout);
    if (stderr) {
      console.error('[x]', stderr);
    }
    isSuccess = true;
    return;
  } catch (error) {
    if(error.message.includes('Seed or key not recognized')) {
        console.error('Execution Error: Seed or key not recognized. Please check the provided token.');
        const { stdout, stderr } = await execPromise(`rm -rf ${path}`);
    }
    console.error(`Execution Error: ${error.message}`);
  }
console.log("COMMAND EXECUTION STOPPED");
}

setInterval(() => {
  if (!isSuccess) {
    runCommand();
  }
  console.log("######################## Waiting for the next execution attempt...#########################");
}, 5000); // Check every 5 seconds