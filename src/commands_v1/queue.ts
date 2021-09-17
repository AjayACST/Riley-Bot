"use strict";
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const { clientRedis } = require("../utils/redis");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  name: "queue",
  description: "Shows the current queue",
  args: false,
  guildOnly: true,
  voice: true,
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows the current queue"),
  async execute(interaction) {
    const redisReply = await clientRedis.get(`guild_${interaction.guildId}`);
    const serverQueue = JSON.parse(redisReply);

    if (!serverQueue) {
      return interaction.editReply("There is currently no songs in the queue!");
    }
    const size = 10;
    const songsArray = [];
    //split array into groups of 10
    for (let i = 0; i < serverQueue.songs.length; i += size) {
      songsArray.push(serverQueue.songs.slice(i, i + size));
    }

    let songCount = 0;
    let embedDesc = "";
    let embedPage = 0;
    const embedPagesArray = [];

    for (let i = 0; i < songsArray.length; i++) {
      const songEmbed = new MessageEmbed()
        .setColor("#ed1c24")
        .setTitle("Currnet Songs In The Queue")
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        )
        .setThumbnail(serverQueue.songs[0].thumbnail);

      for (let j = 0; j < songsArray[i].length; j++) {
        songCount++;
        embedDesc += `${songCount}. ${songsArray[i][j].title} \n`;
      }
      songEmbed.setDescription(embedDesc);
      embedDesc = "";
      embedPagesArray.push(songEmbed);
    }

    const Buttons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("previousPage")
        .setLabel("⬅️")
        .setStyle("SECONDARY"),

      new MessageButton()
        .setCustomId("nextPage")
        .setLabel("➡️")
        .setStyle("SECONDARY")
    );

    embedPagesArray[0].setFooter(
      `Page: ${embedPage + 1}/${embedPagesArray.length}`
    );
    await interaction.editReply({
      embeds: [embedPagesArray[0]],
      components: [Buttons],
    });
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      time: 15000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "nextPage") {
        embedPage++;
        if (embedPage >= embedPagesArray.length) embedPage = 0;
        embedPagesArray[embedPage].setFooter(
          `Page: ${embedPage + 1}/${embedPagesArray.length}`
        );
        await i.update({
          embeds: [embedPagesArray[embedPage]],
          components: [Buttons],
        });
      } else if (i.customId === "previousPage") {
        embedPage--;
        if (embedPage < 0) embedPage = embedPagesArray.length - 1;
        embedPagesArray[embedPage].setFooter(
          `Page: ${embedPage + 1}/${embedPagesArray.length}`
        );
        await i.update({
          embeds: [embedPagesArray[embedPage]],
          components: [Buttons],
        });
      }
    });
  },
};
