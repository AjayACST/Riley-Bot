"use strict";
const { SlashCommandBuilder } = require("@discordjs/builders");
const { clientRedis } = require("../utils/redis");
const { shuffleArray } = require("../utils/utils");
const { TrackUtils } = require("erela.js");

module.exports = {
  name: "shuffle",
  description: "Shuffles the current queue.",
  args: false,
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffles the current queue."),
  async execute(interaction) {
    const manager = interaction.client.manager;
    const player = manager.get(interaction.guildId);
    if (!player) {
      return interaction.editReply("There is currently no song playing!");
    }
    const redisReply = await clientRedis.get(`guild_${interaction.guildId}`);
    const serverQueue = JSON.parse(redisReply);

    if (serverQueue.songs.length === 1) {
      return interaction.editReply(
        "The queue is only 1 song long! Please add some more songs first."
      );
    }

    const ShuffledQueue = shuffleArray(serverQueue.songs);
    serverQueue.songs = ShuffledQueue;

    await clientRedis.set(
      `guild_${interaction.guildId}`,
      JSON.stringify(serverQueue)
    );
    interaction.editReply("Ok, all songs in the queue have been shuffled");
    const unersolvedTrack = TrackUtils.buildUnresolved({
      title: serverQueue.songs[0].title,
      author: serverQueue.songs[0].author,
      duration: serverQueue.songs[0].duration,
    });
    return player.play(unersolvedTrack);
  },
};
