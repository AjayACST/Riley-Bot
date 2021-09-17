"use strict";
const Discord = require("discord.js");
const { clientRedis } = require("../utils/redis");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { Permissions } = require("discord.js");

module.exports = {
  name: "play",
  description: "Plays a song from youtube, spotify or any MP3 url.",
  args: true,
  usage: "<youtube URL, video name or spotify URL>",
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song from youtube, spotify or any MP3 url.")
    .addStringOption((option) =>
      option
        .setName("songname")
        .setDescription("Youtube URL, video name or Spotify URL.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const manager = interaction.client.manager;
    const voiceChannel = interaction.member.voice.channel;

    const permissions = voiceChannel.permissionsFor(interaction.client.user);

    if (
      !permissions.has(Permissions.FLAGS.CONNECT) ||
      !permissions.has(Permissions.FLAGS.SPEAK)
    ) {
      return interaction.editReply(
        "I don't have permission to join or speak in that voice channel!"
      );
    }

    const mediaName = interaction.options.get("songname").value;

    const searchEmbed = new Discord.MessageEmbed()
      .setColor("#ed1c24")
      .setTitle("🔍 Searching For Video")
      .setAuthor(
        interaction.client.user.username,
        interaction.client.user.avatarURL()
      )
      .setDescription(
        `Please wait we are searching for a song called ${mediaName}`
      );
    await interaction.editReply({ embeds: [searchEmbed] });

    const response = await manager.search(mediaName);
    if (!response) {
      return interaction.editReply(
        "Sorry, an error has occurred, please try again later!"
      );
    }
    if (!response.tracks[0]) {
      return interaction.editReply("Sorry, there were no songs found!");
    }

    const songQueue = {
      title: response.tracks[0].title,
      url: response.tracks[0].uri,
      thumbnail: response.tracks[0].thumbnail,
      author: response.tracks[0].author, //used for spotify
      duration: response.tracks[0].duration, //used for spotify
    };

    const redisReply = await clientRedis.get(`guild_${interaction.guildId}`);
    let serverQueue = JSON.parse(redisReply);

    if (!serverQueue) {
      const node = await manager.leastLoadNodes;
      const player = manager.create({
        guild: interaction.guildId,
        voiceChannel: voiceChannel.id,
        textChannel: interaction.channelId,
        selfDeafen: true,
        node: node[0],
      });

      player.connect();

      serverQueue = {
        textChannel: interaction.channel,
        voiceChannel: voiceChannel, //skipcq: JS-0240
        songs: [],
      };
      serverQueue.songs.push(songQueue);
      await clientRedis.set(
        `guild_${interaction.guildId}`,
        JSON.stringify(serverQueue)
      );
      player.play(response.tracks[0]);
    } else {
      serverQueue.songs.push(songQueue);
      clientRedis.set(
        `guild_${interaction.guildId}`,
        JSON.stringify(serverQueue)
      );

      const addQueueEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(songQueue.title)
        .setURL(songQueue.url)
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        )
        .setDescription(
          `[${songQueue.title}](${songQueue.url}) has been added to the queue and is number ${serverQueue.songs.length} in the queue!`
        )
        .setThumbnail(songQueue.thumbnail);

      return interaction.editReply({ embeds: [addQueueEmbed] });
    }
  },
};
