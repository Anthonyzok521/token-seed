import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { issueToken } from './mnemonic-token.ts';
import { env } from './config.ts';
import readline from 'node:readline';
import { appendFileSync } from 'node:fs';
import 'colors';

const execFileAsync = promisify(execFile);

const COMMAND_TIMEOUT_MS = 60000;

const VAULTS = ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh', 'p2tr'];

let isSuccess = false;
let seedCount = 0;
const startTime = Date.now();
let successCount = 0;
let confirmedCount = 0;
let failedCount = 0;
let w = 0;

const elapsed = (count: number) => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec} | Seeds: ${count}`;
};

const processVault = async (vault: string, token: string, hash: string) => {
    const dir = `._tmp/.w/${hash}/${token.split(' ')[0]}`;
    try {
        await execFileAsync(env.COMMAND_RESTORE.split(' ')[0], [...env.COMMAND_RESTORE.split(' ').slice(1), token, '-w', dir], { timeout: COMMAND_TIMEOUT_MS });
        const { stdout } = await execFileAsync(env.COMMAND_RESULT.split(' ')[0], [...env.COMMAND_RESULT.split(' ').slice(1), '-w', dir], { timeout: COMMAND_TIMEOUT_MS });

        let confirmed = 0;
        try {
            const result = JSON.parse(stdout);
            confirmed = Number(result.confirmed || 0);
        } catch (e) {}

        if (confirmed > 0) {
            successCount++;
            confirmedCount += confirmed;
            console.log('\n[+] Success!'.green);
            console.table({ Bit: token.length === 128 ? '128-bit' : '256-bit', Vault: vault, Token: token, Hash: hash, Confirmed: confirmed, Time: elapsed(seedCount) });
            isSuccess = true;
            process.exit(0);
            return true;
        } else {
            failedCount++;
            w++;
            appendFileSync('log.txt', `${token} | ${hash} | ${vault}\n`);
            const statusLine = `[Status: ${elapsed(seedCount).padStart(15)} | ` + `S: ${String(successCount).padStart(4)}`.green + ` | ` + `C: ${String(confirmedCount).padStart(6)}`.blue + ` | ` + `F: ${String(failedCount).padStart(4)}`.red + ` | ` + `W: ${String(w).padStart(2)}`.cyan + `]`;
            process.stdout.write(`\r${statusLine}   `);
            await execFileAsync('rm', ['-rf', `._tmp/.w/${hash}`]).catch(() => {});
            return false;
        }
    } catch (error: any) {
        failedCount++;
        const statusLine = `[Status: ${elapsed(seedCount).padStart(15)} | ` + `S: ${String(successCount).padStart(4)}`.green + ` | ` + `C: ${String(confirmedCount).padStart(6)}`.blue + ` | ` + `F: ${String(failedCount).padStart(4)}`.red + ` | ` + `W: ${String(w).padStart(2)}`.cyan + `]`;
        process.stdout.write(`\r${statusLine}   `);
        await execFileAsync('rm', ['-rf', `._tmp/.w/${hash}`]).catch(() => {});
        return false;
    }
};

const runCommand = async (bitSize: number) => {
    seedCount++;
    const { token, hash } = issueToken(bitSize);
    for (const vault of VAULTS) {
        const result = await processVault(vault, token, hash);
        if (result) break;
    }
};

const startInterface = () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter number of workers: '.blue, (ans) => {
        const n = parseInt(ans, 10);
        const WORKERS = Number.isFinite(n) && n > 0 ? n : 8;
        rl.close();

        const statusInterval = setInterval(() => {
            if (!isSuccess) {
                const statusLine = `[Status: ${elapsed(seedCount).padStart(15)} | ` + `S: ${String(successCount).padStart(4)}`.green + ` | ` + `C: ${String(confirmedCount).padStart(6)}`.blue + ` | ` + `F: ${String(failedCount).padStart(4)}`.red + ` | ` + `W: ${String(w).padStart(2)}`.cyan + `]`;
                process.stdout.write(`\r${statusLine}   `);
            }
        }, 500);
        process.on('exit', () => clearInterval(statusInterval));

        const worker = async () => {
            while (!isSuccess) {
                if (seedCount >= 1000) seedCount = 0;
                const bitSize = Math.random() < 0.5 ? 128 : 256;
                try { await runCommand(bitSize); } catch (e) { console.error('[Worker Error]'.red, e); }
            }
        };
        for (let i = 0; i < WORKERS; i++) worker();
        console.log(`\n[+] Started with ${WORKERS} workers.`.gray);
        console.log(`[+] Press Ctrl+C to stop.`.gray);
    });
};

startInterface();
