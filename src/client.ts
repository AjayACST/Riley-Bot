import {
  Channel,
  ClientOptions,
  Collection,
  Permissions,
  TextChannel,
} from "discord.js";
import { Manager, TrackUtils } from "erela.js";
import Spotify from "erela.js-spotify";
import {
  lavalinkNodes,
  spotifyClientID,
  spotifyClientSecret,
} from "../config.json";
import { clientRedis, clientRedisNoAsync } from "./utils/redis";
import { SapphireClient } from "@sapphire/framework";
import redisScan from "node-redis-scan";
import * as Sentry from "@sentry/node";
import * as fs from "fs";

export class Client extends SapphireClient {
  constructor(options: ClientOptions) {
    super(options);
    this.startManager();
    this.clientEvents();
  }

  commands = new Collection<string, any>();
  manager: Manager;

  startManager() {
    this.manager = new Manager({
      nodes: lavalinkNodes,

      plugins: [
        new Spotify({
          clientID: spotifyClientID,
          clientSecret: spotifyClientSecret,
        }),
      ],
      send(id, payload) {
        const guild = this.guilds.cache.get(id);
        if (guild) {
          guild.shard.send(payload);
        }
      },
    });

    this.manager.on("nodeConnect", (node) => {
      console.log(`Node ${node.options.identifier} connected`); //skipcq: JS-0002

      // go through redis and check if theer are any queues that need playing if the bot has crashed.
      const scanner = new redisScan(clientRedisNoAsync);
      scanner.eachScan(
        "guild_*",
        async (matchingKeys) => {
          // Depending on the pattern being scanned for, many or most calls to
          // this function will be passed an empty array.
          if (matchingKeys.length) {
            // Matching keys found after this iteration of the SCAN command.
            for (let i = 0; i < matchingKeys.length; i++) {
              const redisQueue = await clientRedis.get(matchingKeys[i]);
              const serverQueue = JSON.parse(redisQueue);
              if (this.manager.get(serverQueue.textChannel.guildId)) return;
              const node = this.manager.leastLoadNodes;
              const player = this.manager.create({
                guild: serverQueue.voiceChannel.guildId,
                voiceChannel: serverQueue.voiceChannel.id,
                textChannel: serverQueue.textChannel.channelId,
                selfDeafen: true,
                node: node[0],
              });
              player.connect();
              // check for spotify tracks played from /playlist command
              if (!serverQueue.songs[0].url) {
                const unersolvedTrack = TrackUtils.buildUnresolved({
                  title: serverQueue.songs[0].title,
                  author: serverQueue.songs[0].author,
                  duration: serverQueue.songs[0].duration,
                });
                return player.play(unersolvedTrack);
              }
              const response = await this.manager.search(
                serverQueue.songs[0].url
              );
              player.play(response.tracks[0]);

              await player.play(response.tracks[0]);
            }
          }
        },
        (err, matchCount) => {
          if (err) throw err;

          // matchCount will be an integer count of how many total keys
          // were found and passed to the intermediate callback.
          console.log(`Found ${matchCount} keys.`);
        }
      );
    });

    this.manager.on(
      "nodeError",
      (node, error) =>
        console.log(
          `Node ${node.options.identifier} had an error: ${error.message}`
        ) //skipcq: JS-0002
    );

    this.manager.on("trackStart", async (player, track) => {
      const redisReply = await clientRedis.get(`guild_${player.guild}`);
      const serverQueue = JSON.parse(redisReply);
      if (!player.textChannel) return;
      const channel: TextChannel = this.channels.cache.get(player.textChannel);
      if (!channel || !this.checkChannelPermissions(channel)) return;
      const newQueueEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(track.title)
        .setURL(track.uri)
        .setAuthor(this.user.username, this.user.avatarURL())
        .setDescription(
          `[${track.title}](${track.uri}) is now playing and is number 1 in the queue!`
        )
        .setThumbnail(track.thumbnail);

      const Buttons = new Discord.MessageActionRow().addComponents(
        new Discord.MessageButton()
          .setCustomId("stop")
          .setLabel("⏹️")
          .setStyle("SECONDARY"),

        new Discord.MessageButton()
          .setCustomId("pause")
          .setLabel("⏯️")
          .setStyle("SECONDARY"),

        new Discord.MessageButton()
          .setCustomId("skip")
          .setLabel("⏭️")
          .setStyle("SECONDARY")
      );

      const message = await channel.send({
        embeds: [newQueueEmbed],
        components: [Buttons],
      });

      const collector = message.createMessageComponentCollector({
        time: serverQueue.songs[0].duration,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "stop") {
          if (!player) {
            return collector.stop();
          }
          serverQueue.songs = [];
          await clientRedis.set(
            `guild_${i.guildId}`,
            JSON.stringify(serverQueue)
          );
          player.stop();
          i.reply("Stoping the music!");
          return collector.stop();
        } else if (i.customId === "pause") {
          if (!player) {
            return collector.stop();
          }
          player.pause(!player.paused);
          const pauseText = player.paused ? "paused" : "unpaused";
          i.reply(`I have ${pauseText} the music!`);
        } else if (i.customId === "skip") {
          if (!player) {
            return collector.stop();
          }
          player.stop();
          i.reply("I have skipped to the next song!");
          if (serverQueue.songs.length === 1) {
            return collector.stop();
          }
          return;
        }
      });
    });

    this.manager.on("queueEnd", async (player) => {
      const redisReply = await clientRedis.get(`guild_${player.guild}`);
      const serverQueue = JSON.parse(redisReply);
      let sendMessage = true;
      if (!player.textChannel) {
        sendMessage = false;
      }
      const channel: TextChannel = this.channels.cache.get(player.textChannel);
      if (channel) {
        sendMessage = false;
      }
      if (!this.checkChannelPermissions(channel)) {
        sendMessage = false;
      }

      serverQueue.songs.shift();

      if (!serverQueue.songs[0]) {
        await clientRedis.del(`guild_${player.guild}`);
        if (sendMessage) {
          channel.send("No more songs in queue, leaving voice channel!");
        }

        return player.destroy();
      }
      await clientRedis.set(
        `guild_${player.guild}`,
        JSON.stringify(serverQueue)
      );
      // check for spotify tracks played from /playlist command
      if (!serverQueue.songs[0].url) {
        const unersolvedTrack = TrackUtils.buildUnresolved({
          title: serverQueue.songs[0].title,
          author: serverQueue.songs[0].author,
          duration: serverQueue.songs[0].duration,
        });
        return player.play(unersolvedTrack);
      }
      const response = await this.manager.search(serverQueue.songs[0].url);
      player.play(response.tracks[0]);
    });

    this.manager.on("playerMove", async (player, oldChannel, newChannel) => {
      if (!newChannel) {
        await clientRedis.del(`guild_${player.guild}`);
        return player.destroy();
      }
      const position = player.position;
      player.setVoiceChannel(newChannel);
      await player.play(player.queue.current);
      return player.seek(position);
    });
  }

  clientEvents() {
    const commandFiles = fs
      .readdirSync("./commands")
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      this.commands.set(command.name, command);
    }

    this.once("ready", () => {
      console.log(`Logged in as ${this.user.tag}!`); //skipcq: JS-0002
      this.manager.init(this.user.id);
      this.user.setActivity("for /help", { type: "WATCHING" });
    });

    // send voice events to lavalink library

    this.on("raw", (d) => this.manager.updateVoiceState(d));

    this.on("interactionCreate", async (interaction) => {
      if (!interaction.isCommand()) return;
      await interaction.deferReply();
      const channel: TextChannel = interaction.channel;

      if (checkChannelPermissions(!interaction.channel)) {
        try {
          const errorEmbed = new Discord.MessageEmbed()
            .setColor("#ed1c24")
            .setTitle(`Missing Permissions in Guild ${interaction.guild.name}!`)
            .setDescription(
              `Hey! You just ran the ${interaction.commandName} command on server ${interaction.guild.name} but I don't have permission to send messages on that channel. Please make sure that I have send messages permission for that channel and try again.`
            );

          return interaction.user.send({ embeds: [errorEmbed] });
        } catch {
          return;
        }
      }

      if (
        !interaction.channel
          .permissionsFor(interaction.this.user.id)
          .has(Permissions.FLAGS.EMBED_LINKS)
      ) {
        return interaction.editReply(
          "I need permission to send embeds in this channel!"
        );
      }

      if (
        !interaction.channel
          .permissionsFor(interaction.this.user.id)
          .has(Permissions.FLAGS.VIEW_CHANNEL)
      ) {
        return interaction.editReply("I need permission to view this channel!");
      }

      const command = this.commands.get(interaction.commandName);

      if (command.guildOnly) {
        if (!interaction.guild) {
          return interaction.editReply(
            "This command can only be ran in guilds!"
          );
        }
      }

      if (command.voice) {
        if (!interaction.member.voice.channel) {
          return interaction.editReply("You are not in a voice channel!");
        }
      }

      const transaction = Sentry.startTransaction({
        op: "command",
        name: "Command ran on Boombox",
      });

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err); //skipcq: JS-0002
        interaction.editReply(
          "There was an error trying to execute that command!"
        );
        Sentry.captureException(err);
      } finally {
        transaction.finish();
      }
    });
  }

  checkChannelPermissions(channel: TextChannel) {
    if (
      !channel
        .permissionsFor(this.user.id)
        .has([
          Permissions.FLAGS.SEND_MESSAGES,
          Permissions.FLAGS.EMBED_LINKS,
          Permissions.FLAGS.VIEW_CHANNEL,
        ])
    ) {
      return false;
    }
    return true;
  }
}
