import * as Sentry from "@sentry/node";
import { Client } from "./client";

import { token, sentryDSN, sentryEnv } from "../config.json";
import { LogLevel } from "@sapphire/framework";

const client = new Client({
  defaultPrefix: "$",
  caseInsensitiveCommands: true,
  logger: {
    level: LogLevel.Trace,
  },
  shards: "auto",
  intents: [
    "GUILDS",
    "GUILD_VOICE_STATES",
    "DIRECT_MESSAGES",
    "GUILD_MESSAGE_REACTIONS",
  ],
});

Sentry.init({
  dsn: sentryDSN,
  tracesSampleRate: 1.0,
  environment: sentryEnv,
});

async function main() {
  try {
    client.logger.info("Logging in");
    await client.login(token);
    client.logger.info("Logged in");
  } catch (error) {
    client.logger.fatal(error);
    client.destroy();
    process.exit(1);
  }
}

main();
