import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from 'dotenv';
import ccolor from 'ccolor';

config();

const execPromise = promisify(exec);
const path = `~/._tmp/.ew/.w/`;
const folders = [];
const seeds = [];
const runCommand = async () => {
    
console.log(ccolor.blue("INITIATING COMMAND EXECUTION"));

try {
    const { stdout, stderr } = await execPromise(`ls ${path}`);
    //console.log(stdout);
    folders.push(...stdout.split('\n').filter(folder => folder.trim() !== ''));
    //console.log(ccolor.yellow('Folders found:'), folders);
    
    if(folders.length > 0){
        console.log(ccolor.green('STDOUT:'), `Folders found: ${folders.length}`);
    }

    if (stderr) {
      console.error(ccolor.red('[x]'), stderr);
    }

    for (const folder of folders) {
        const folderPath = `${path}${folder}`;
        const { stdout: folderStdout, stderr: folderStderr } = await execPromise(`ls ${folderPath}`);
        const files = folderStdout.split('\n').filter(file => file.trim() !== '');
        //console.log(ccolor.yellow(`Files in ${folder}:`), files.length > 0 ? files : 'No files found');
        if (folderStderr) {
            console.error(ccolor.red(`[x] Error in folder ${folder}:`), folderStderr);
        }

        if(files.length === 0){
            //delete folder
            await execPromise(`rm -rf ${folderPath}`);
        }else{
        
            console.log(ccolor.yellow(`Get seed in:`), `${folder}/${files}`);
            const { stdout: laodStdout, stderr: laodStderr } = await execPromise(`${process.env.COMMAND_LOAD} -w ${path}${folder}/${files}`);
            if (laodStderr) {
                console.error(ccolor.red(`[x] Error loading wallet in ${folder}:`), laodStderr);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { stdout: extractStdout, stderr: extractStderr } = await execPromise(`${process.env.COMMAND_EXTRACT} -w ${path}${folder}/${files}`);
            if (extractStderr) {
                console.error(ccolor.red(`[x] Error extracting seed in ${folder}:`), extractStderr);
            }
            console.log(ccolor.green(`Extracted Seed:`), extractStdout.trim());
            seeds.push(extractStdout.trim());
            console.log(ccolor.cyan(`Loading...`));
        }
    }

    console.log(ccolor.cyan('######################## Waiting for the next execution attempt...#########################'));
    await new Promise(resolve => setTimeout(resolve, 500));

    const { stdout: folderSeedtStdout, stderr: folderSeedtStderr } = await execPromise(`touch ${path}seeds.txt`);
    if (folderSeedtStderr) {
        console.error(ccolor.red(`[x] Error creating seeds folder:`), folderSeedtStderr);
    }
    for (const seed of seeds) {
        const { stdout: saveSeedtStdout, stderr: saveSeedtStderr } = await execPromise(`echo "${seed}" >> ${path}seeds.txt`);
        if (saveSeedtStderr) {
            console.error(ccolor.red(`[x] Error creating seed file for ${seed}:`), saveSeedtStderr);
        }
    }
    //finished
    console.log(ccolor.green('######################## Finished! #########################'));
}catch(e){
    console.error(ccolor.red(`Execution Error: ${e.message}`));
}
}

runCommand();