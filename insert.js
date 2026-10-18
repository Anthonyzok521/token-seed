import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { issueToken } from './mnemonic-token.js';
import { config } from 'dotenv';
import ccolor from 'ccolor';

// Load environment variables from .env file
config();

let isSuccess = false;
let isRunning = false;
let intervalId;

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
    const { stdout, stderr } = await execPromise(`mkdir ${path}; ${process.env.COMMAND_RESTORE} "p2pkh:bip39:${token}" -w ${path}/${token.split(' ')[0]}`);
    console.log(ccolor.green('STDOUT:'), stdout);
    if (stderr) {
      console.error(ccolor.red('[x]'), stderr);
    }

    console.log(ccolor.cyan('Loading...'));

    const { stdout: stdout2, stderr: stderr2 } = await execPromise(`${process.env.COMMAND_LOAD} -w ${path}/${token.split(' ')[0]}`);
    console.log(ccolor.green('STDOUT:'), stdout2);
    if (stderr2) {
      console.error(ccolor.red('[x]'), stderr2);
    }

    const { stdout: stdout3, stderr: stderr3 } = await execPromise(`${process.env.COMMAND_RESULT} -w ${path}/${token.split(' ')[0]}`);
    console.log(ccolor.green('STDOUT:'), stdout3);
    if (stderr3) {
      console.error(ccolor.red('[x]'), stderr3);
    }

    
    const { confirmed } = JSON.parse(stdout3);
    const confirmedCount = Number(confirmed);
    console.log(ccolor.cyan('CONFIRMED:'), confirmed);

    if(confirmedCount > 0){
        console.log(ccolor.green(`[✓] Success! ${confirmed}.`));
        isSuccess = true;
        clearInterval(intervalId);
    }else{
        console.error(ccolor.orange(`[x] Please check the provided token.`));
    }

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

intervalId = setInterval(() => {
  if (!isSuccess && !isRunning) {
    isRunning = true;
    runCommand().finally(() => {
      isRunning = false;
    });
  }
  if (!isSuccess) {
    console.log(ccolor.cyan("######################## Waiting for the next execution attempt...#########################"));
  }
}, 5000); // Check every 5 seconds