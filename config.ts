import { config } from 'dotenv';

config();

const REQUIRED_VARS = ['COMMAND_RESTORE', 'COMMAND_LOAD', 'COMMAND_RESULT'] as const;

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
    console.error('Faltan variables de entorno requeridas:');
    for (const name of missing) {
        console.error(`  - ${name}`);
    }
    process.exit(1);
}

export const env = {
    COMMAND_RESTORE: process.env.COMMAND_RESTORE as string,
    COMMAND_LOAD: process.env.COMMAND_LOAD as string,
    COMMAND_RESULT: process.env.COMMAND_RESULT as string,
};
