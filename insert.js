import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { issueToken } from './mnemonic-token.js';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Convert exec into a promise-based function
const execPromise = promisify(exec);

async function runCommand() {
console.log("INITIATING COMMAND EXECUTION");
  try {
    const { token, hash } = issueToken(128);
    const path = `~/._tmp/.ew/.w/${hash}`;
    const { stdout, stderr } = await execPromise(`mkdir ${path}; ${process.env.COMMAND} "p2pkh:bip39:${token}" -w ${path}/${token.split(' ')[0]}`);

    console.log('TABLE:');
    console.table({
      token: token,
      hash: hash
    });
    console.log('STDOUT:', stdout);
    if (stderr) {
      console.error('[x]', stderr);
    }
  } catch (error) {
    console.error(`Execution Error: ${error.message}`);
  }
console.log("COMMAND EXECUTION STOPPED");
}

runCommand();