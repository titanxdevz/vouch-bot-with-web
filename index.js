/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                          ║
 * ║   ██╗   ██╗ ██████╗ ██╗   ██╗ ██████╗██╗  ██╗    ██████╗  ██████╗ ████████╗  ║
 * ║   ██║   ██║██╔═══██╗██║   ██║██╔════╝██║  ██║    ██╔══██╗██╔═══██╗╚══██╔══╝  ║
 * ║   ██║   ██║██║   ██║██║   ██║██║     ███████║    ██████╔╝██║   ██║   ██║     ║
 * ║   ╚██╗ ██╔╝██║   ██║██║   ██║██║     ██╔══██║    ██╔══██╗██║   ██║   ██║     ║
 * ║    ╚████╔╝ ╚██████╔╝╚██████╔╝╚██████╗██║  ██║    ██████╔╝╚██████╔╝   ██║     ║
 * ║     ╚═══╝   ╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝     ║
 * ║                                                                          ║
 * ║                  [ Professional Reputation System ]                      ║
 * ║                                                                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Developer  : Ansh4Real                                                  ║
 * ║  Version    : 2.0.0                                                      ║
 * ║  Engine     : Discord.js v14                                             ║
 * ║  License    : Private                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const loadCommands = require('./handlers/commandHandler');
const loadEvents = require('./handlers/eventHandler');
const { startDashboard } = require('./utils/dashboard');



const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
};

const tag = (color, label) => `${color}${C.bold}[ ${label} ]${C.reset}`;

const log = {
  info: (msg) => console.log(`${tag(C.cyan, 'INFO')} ${C.white}${msg}${C.reset}`),
  ready: (msg) => console.log(`${tag(C.green, 'READY')} ${C.white}${msg}${C.reset}`),
  warn: (msg) => console.log(`${tag(C.yellow, 'WARN')} ${C.white}${msg}${C.reset}`),
  error: (msg) => console.log(`${tag(C.red, 'ERROR')} ${C.white}${msg}${C.reset}`),
  load: (msg) => console.log(`${tag(C.magenta, 'LOAD')} ${C.white}${msg}${C.reset}`),
  event: (msg) => console.log(`${tag(C.blue, 'EVENT')} ${C.white}${msg}${C.reset}`),
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printLine(char = '-', length = 60, color = C.gray) {
  console.log(`${color}${char.repeat(length)}${C.reset}`);
}

async function animateBar(label, color = C.cyan, steps = 20, delay = 40) {
  const bar = Array(steps).fill(' ');
  process.stdout.write(`\r${color}${C.bold}  ${label.padEnd(20)}${C.reset} ${C.gray}[${C.reset}`);
  for (let i = 0; i < steps; i++) {
    bar[i] = '#';
    process.stdout.write(`\r${color}${C.bold}  ${label.padEnd(20)}${C.reset} ${C.gray}[${C.reset}${color}${bar.join('')}${C.reset}${C.gray}]${C.reset} ${C.dim}${Math.round(((i + 1) / steps) * 100)}%${C.reset}  `);
    await sleep(delay);
  }
  process.stdout.write(`\r${color}${C.bold}  ${label.padEnd(20)}${C.reset} ${C.gray}[${C.reset}${color}${'#'.repeat(steps)}${C.reset}${C.gray}]${C.reset} ${C.green}done${C.reset}       \n`);
}

async function bootSequence() {
  console.clear();

  console.log();
  printLine('=', 62, C.blue);
  console.log(`${C.blue}${C.bold}${'='.repeat(62)}${C.reset}`);
  console.log(
    `${C.blue}||${C.reset}` +
    `${C.cyan}${C.bold}${'  VOUCH BOT  v2.0.0  —  Professional Reputation System'.padStart(46).padEnd(60)}${C.reset}` +
    `${C.blue}||${C.reset}`
  );
  console.log(
    `${C.blue}||${C.reset}` +
    `${C.gray}${'  Developed by Ansh4Real  |  Discord.js v14'.padStart(42).padEnd(60)}${C.reset}` +
    `${C.blue}||${C.reset}`
  );
  console.log(`${C.blue}${C.bold}${'='.repeat(62)}${C.reset}`);
  printLine('=', 62, C.blue);
  console.log();

  log.info('Starting boot sequence...');
  console.log();

  await animateBar('Core Modules', C.cyan, 20, 30);
  await animateBar('Command Handler', C.magenta, 20, 35);
  await animateBar('Event Handler', C.blue, 20, 30);
  await animateBar('Gateway Login', C.green, 20, 40);

  console.log();
  printLine('-', 62, C.gray);
  console.log();
}


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  allowedMentions: { parse: [], repliedUser: false },
});

client.commands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();
client.config = config;

process.on('unhandledRejection', error => {
  log.error(`Unhandled Promise Rejection :: ${error?.message ?? error}`);
  if (error?.stack) console.error(C.dim + error.stack + C.reset);
});

process.on('uncaughtException', error => {
  log.error(`Uncaught Exception :: ${error?.message ?? error}`);
  if (error?.stack) console.error(C.dim + error.stack + C.reset);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log();
  printLine('=', 62, C.red);
  log.warn('Shutdown signal received — terminating process.');
  printLine('=', 62, C.red);
  console.log();
  process.exit(0);
});

(async () => {
  await bootSequence();

  log.load('Loading command modules...');
  loadCommands(client);
  log.load(`Commands registered: ${C.cyan}${client.commands.size}${C.reset}`);

  log.event('Attaching event listeners...');
  loadEvents(client);

  console.log();
  log.info('Connecting to Discord Gateway...');

  await client.login(client.config.token);

  startDashboard(client, client.config.port);

  console.log();
  printLine('=', 62, C.green);
  console.log(
    `${C.green}${C.bold}  >> ONLINE  ${C.reset}` +
    `${C.white}Logged in as ${C.cyan}${C.bold}${client.user?.tag ?? 'Unknown'}${C.reset}`
  );
  console.log(
    `${C.green}${C.bold}  >> GUILDS  ${C.reset}` +
    `${C.white}Serving ${C.cyan}${C.bold}${client.guilds.cache.size}${C.reset}${C.white} server(s)${C.reset}`
  );
  console.log(
    `${C.green}${C.bold}  >> CMDS    ${C.reset}` +
    `${C.white}${C.cyan}${C.bold}${client.commands.size}${C.reset}${C.white} command(s) loaded${C.reset}`
  );
  console.log(
    `${C.green}${C.bold}  >> UPTIME  ${C.reset}` +
    `${C.white}${new Date().toUTCString()}${C.reset}`
  );
  printLine('=', 62, C.green);
  console.log();
  console.log(`${C.gray}  All systems operational. Ready to accept interactions.${C.reset}`);
  console.log(`${C.gray}  Press Ctrl+C to shut down gracefully.${C.reset}`);
  console.log();
  printLine('-', 62, C.gray);
  console.log();
})();