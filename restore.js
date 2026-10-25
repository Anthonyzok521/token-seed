import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from 'dotenv';
import ccolor from 'ccolor';

config();

const execPromise = promisify(exec);
const path = `~/._tmp/.ew/.w/`;
const vault = [
    "p2pkh:bip39:",
    "p2wpkh-p2sh:bip39:",
    "p2wpkh:bip39:",
    "p2tr:bip39:",
]
const seeds = [];
const runCommand = async () => {

    console.log(ccolor.blue("INITIATING COMMAND EXECUTION"));

    try {
        const { stdout, stderr } = await execPromise(`cat ${path}seeds.txt`);
        //console.log(ccolor.green('STDOUT:'), `cat ${path}seeds.txt Seeds found: ${stdout}`);
        seeds.push(...stdout.split('\n').filter(seed => seed.trim() !== ''));
        if (stderr) {
            console.error(ccolor.red('[x]'), stderr);
        }

        console.log(ccolor.green('STDOUT:'), `Seeds found: ${seeds.length}`);
        //console.log(ccolor.yellow('Seeds:'), seeds.length > 0 ? seeds : 'No seeds found');

        for (const seed of seeds) {
            for (const v of vault) {
                const pathW = `${path}${seed.split(' ')[0]}${v.replace(/:/g, '_')}`;
                try {
                    const { stdout: restoreStdout, stderr: restoreStderr } = await execPromise(`${process.env.COMMAND_RESTORE} "${v}${seed}" -w ${pathW}`);
                    if (restoreStderr) {
                        console.error(ccolor.red(`[x] Error restoreing seed ${seed}:`), restoreStderr);
                    }
                    const { stdout: loadStdout, stderr: loadStderr } = await execPromise(`${process.env.COMMAND_LOAD} -w ${pathW}`);
                    if (loadStderr) {
                        console.error(ccolor.red(`[x] Error loading seed ${seed}:`), loadStderr);
                    }
                    //console.log(ccolor.green(`Loading Seed:`), `${seed.split(' ')[0]} and vault: ${v}`);
                    const { stdout: resulteStdout, stderr: resulteStderr } = await execPromise(`${process.env.COMMAND_RESULT} -w ${pathW}`);
                    if (resulteStderr) {
                        console.error(ccolor.red(`[x] Error getting result for seed ${seed}:`), resulteStderr);
                    }
                    const { confirmed } = JSON.parse(resulteStdout);
                    const confirmedCount = Number(confirmed);
                    
                    if (confirmedCount > 0) {
                        console.log(ccolor.cyan('Num Seed:'), seeds.indexOf(seed) + 1);
                        console.log(ccolor.green(`[✓] Success! ${confirmed}.`));
                        console.log(ccolor.green(`provided seed:`), pathW);
                    } else {
                        //console.error(ccolor.yellow(`[x] clear seed: ${seed.split(' ')[0]} and vault: ${v} result is ${confirmed}...`));
                        //console.log(ccolor.cyan('######################## Waiting for next seed #########################'));
                    }
                } catch (e) {
                    if (e.toString().includes('Seed or key not recognized')) {
                        //console.log(ccolor.cyan(`Seed:`), `${v}${seed}`);
                        //console.error(ccolor.red('[x] Seed or key not recognized... Please check the provided token.'));
                    } else {
                        console.error(ccolor.red('[x]'), e);
                    }
                }
            }
        }

        console.log(ccolor.cyan('######################## FINISHED #########################'));
    } catch (e) {
        console.error(ccolor.red('[x]'), e);
    }
}

runCommand();