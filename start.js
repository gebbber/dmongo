import { exec, spawn as spawnProcess } from 'node:child_process';
import { rmSync } from 'node:fs';

function rimRafNodeModules() {
    log('rm -rf ./node_modules');
    try {
        rmSync('./node_modules', { recursive: true, force: true });
    } catch (err) {
        if (err.code !== 'ENOENT') process.exit(1);
    }
    newLine();
}

async function start() {
    // rimRafNodeModules();

    await run(`docker-compose build`);

    await run('docker-compose up -d');
}

async function reset() {
    console.log();
    await run(`docker-compose down`);
    return await start();
}

const message = `\x1b[94mOnce launched, press \x1b[93mESC to quit\x1b[94m, or \x1b[93mR to restart\x1b[94m containers.\x1b[39m\n\n\x1b[94m(\x1b[93mCtrl-C\x1b[94m will quit without bringing the containers down)\x1b[39m\n`;
console.log(message);

await start();

const stdin = process.stdin;

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

stdin.on('data', async function (key) {
    const ctrlC = key === '\u0003';
    const esc = key === '\x1b';
    const restart = key.toLowerCase() === 'r';

    if (restart) await reset();

    if (esc || ctrlC) {
        stdin.pause();
        run('docker-compose down').then(() => {
            process.exit(0);
        });
    }
});

async function run(command) {
    log(command);

    const p = setInterval(() => {
        process.stdout.write('\x1b[90m.\x1b[39m');
    }, 100);

    const result = await new Promise((resolve, reject) => {
        exec(command, (err, output) => {
            if (err) reject(err);
            else resolve(output);
        });
    });

    newLine();
    clearInterval(p);

    return result;
}

function newLine(n) {
    console.log('\x1b[32m✓\x1b[39m');
    for (let i = 0; i < n; i++) console.log();
}

function spawn(command, args) {
    log(command, ...args);
    newLine(1);
    const childProcess = spawnProcess(command, args || []);
    childProcess.stdout.on('data', data => process.stdout.write(data.toString()));
    childProcess.stderr.on('data', data => process.stderr.write(data.toString()));
    return childProcess;
}

function log(...text) {
    const brightYellow = 93;
    const brightBlue = 94;

    const data = text.filter(String).join(' ');
    const [command, ...params] = data.split(' ');
    const parameters = params.join(' ');

    process.stdout.write(`\x1b[${brightYellow}m${command}\x1b[39m`);
    if (parameters) process.stdout.write(` \x1b[${brightBlue}m${parameters}\x1b[49m\x1b[39m`);
    process.stdout.write(`\x1b[90m...\x1b[39m`);
}

function replaceAll(str, pre, post) {
    let s = str;
    if (pre !== post) while (s.includes(pre)) s = s.replace(pre, post);
    return s;
}
