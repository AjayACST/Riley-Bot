"use strict";
const { clientRedis } = require("../utils/redis");
const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { TrackUtils } = require("erela.js");
const { Permissions } = require("discord.js");

module.exports = {
  name: "savequeue",
  description: "Saves the current queue, or loads a saved queue.",
  args: true,
  usage: "<save | load | list> [queue name]",
  data: new SlashCommandBuilder()
    .setName("savequeue")
    .setDescription("Saves the current queue, or loads a saved queue.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("save")
        .setDescription("Saves the current queue.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name you would like to save the queue as.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("load")
        .setDescription("Loads a queue from the saved queues.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of the queue you would like loaded.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Lists all your saved queues.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a saved queue")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of the saved queue you would like to delete.")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === "save") {
      const queueName = interaction.options.getString("name");
      let userQueues = [];
      const redisReply = await clientRedis.get(`guild_${interaction.guildId}`);
      const serverQueue = JSON.parse(redisReply);

      if (!serverQueue) {
        return interaction.editReply(
          "There is currently no songs in the queue to save!"
        );
      }
      const redisSaveReply = await clientRedis.get(
        `save_${interaction.user.id}`
      );
      if (redisSaveReply) {
        const redisSaveQueue = JSON.parse(redisSaveReply);
        for (let i = 0; i < redisSaveQueue.length; i++) {
          if (redisSaveQueue[i].name === queueName) {
            return interaction.editReply(
              `There is already a saved queue called ${queueName}! PLease choose a different name.`
            );
          }
        }
        userQueues = JSON.parse(redisSaveReply);
      }

      const queuePush = {
        name: queueName,
        songs: serverQueue.songs,
      };
      userQueues.push(queuePush);
      await clientRedis.set(
        `save_${interaction.user.id}`,
        JSON.stringify(userQueues)
      );
      const saveEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(
          `💾  I have saved the current queue under the name ${queueName}!`
        )
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        );

      return interaction.editReply({ embeds: [saveEmbed] });
    } else if (interaction.options.getSubcommand() === "list") {
      const redisReply = await clientRedis.get(`save_${interaction.user.id}`);

      if (!redisReply) {
        return interaction.editReply("There are no saved queues!");
      }

      const savedQueues = JSON.parse(redisReply);
      const size = 10;
      const queueArray = [];

      for (let i = 0; i < savedQueues.length; i += size) {
        queueArray.push(savedQueues.slice(i, i + size));
      }

      let queueCount = 0;
      let embedDesc = "";
      let embedPage = 0;
      const embedPagesArray = [];

      for (let i = 0; i < queueArray.length; i++) {
        const queueEmbed = new Discord.MessageEmbed()
          .setColor("#ed1c24")
          .setTitle(`Current Saved Queues for ${interaction.user.username}`)
          .setAuthor(
            interaction.client.user.username,
            interaction.client.user.avatarURL()
          )
          .setThumbnail(savedQueues[0].songs[0].thumbnail);

        for (let j = 0; j < queueArray[i].length; j++) {
          queueCount++;
          embedDesc += `${queueCount}. ${queueArray[i][j].name} with ${queueArray[i][j].songs.length} songs saved. \n`;
        }
        queueEmbed.setDescription(embedDesc);
        embedPagesArray.push(queueEmbed);
      }

      const Buttons = new Discord.MessageActionRow().addComponents(
        new Discord.MessageButton()
          .setCustomId("previousPage")
          .setLabel("⬅️")
          .setStyle("SECONDARY"),

        new Discord.MessageButton()
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
    } else if (interaction.options.getSubcommand() === "load") {
      const redisReply = await clientRedis.get(`save_${interaction.user.id}`);
      if (!redisReply) {
        return interaction.editReply("You have no queues saved!");
      }
      const name = interaction.options.getString("name");
      const savedQueues = JSON.parse(redisReply);
      let queueIndex = -1;
      for (let i = 0; i < savedQueues.length; i++) {
        if (savedQueues[i].name === name) {
          queueIndex = i;
          break;
        }
      }

      if (queueIndex === -1) {
        return interaction.editReply(
          `The queue with the name of ${name} could not be found!`
        );
      }

      const loadEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(`Now loading all songs from the saved queue ${name}`)
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        );

      interaction.editReply({ embeds: [loadEmbed] });

      const manager = interaction.client.manager;
      const voiceChannel = interaction.member.voice.channel;

      if (!manager.get(interaction.guildId)) {
        const permissions = voiceChannel.permissionsFor(
          interaction.client.user
        );

        if (
          !permissions.has(Permissions.FLAGS.CONNECT) ||
          !permissions.has(Permissions.FLAGS.SPEAK)
        ) {
          return interaction.editReply(
            "I don't have permission to join or speak in that voice channel!"
          );
        }

        let song;

        if (!savedQueues[queueIndex].songs[0].url) {
          song = await TrackUtils.buildUnresolved({
            title: savedQueues[queueIndex].songs[0].title,
            author: savedQueues[queueIndex].songs[0].author,
            duration: savedQueues[queueIndex].songs[0].duration,
          });
        } else {
          const response = await manager.search(
            savedQueues[queueIndex].songs[0].url
          );

          if (!response) {
            return interaction.editReply(
              "Sorry, an error has occurred, please try again later!"
            );
          }
          if (!response.tracks[0]) {
            return interaction.editReply("Sorry, there were no songs found!");
          }
          song = response.tracks[0];
        }

        const node = await manager.leastLoadNodes;
        console.log(node);
        const player = manager.create({
          guild: interaction.guildId,
          voiceChannel: voiceChannel.id,
          textChannel: interaction.channelId,
          selfDeafen: true,
          node: node[0],
        });

        player.connect();

        const serverQueue = {
          textChannel: interaction.channel,
          voiceChannel: voiceChannel, //skipcq: JS-0240
          songs: [],
        };

        for (let i = 0; i < savedQueues[queueIndex].songs.length; i++) {
          serverQueue.songs.push(savedQueues[queueIndex].songs[i]);
        }

        await clientRedis.set(
          `guild_${interaction.guildId}`,
          JSON.stringify(serverQueue)
        );

        player.play(song);
      } else {
        const redisQueueReply = await clientRedis.get(
          `guild_${interaction.guildId}`
        );

        const serverQueue = JSON.parse(redisQueueReply); //skipcq: JS-0123

        for (let i = 0; i < savedQueues[queueIndex].songs.length; i++) {
          serverQueue.songs.push(savedQueues[queueIndex].songs[i]);
        }

        await clientRedis.set(
          `guild_${interaction.guildId}`,
          JSON.stringify(serverQueue)
        );
      }
      const queueEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(`All songs from ${name} has been loaded into the queue!`)
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        );

      return interaction.editReply({ embeds: [queueEmbed] });
    } else if (interaction.options.getSubcommand() === "delete") {
      const redisReply = await clientRedis.get(`save_${interaction.user.id}`);

      if (!redisReply) {
        return interaction.editReply("You have no queues saved!");
      }

      const name = interaction.options.getString("name");
      const savedQueues = JSON.parse(redisReply);
      let queueIndex = -1;
      for (let i = 0; i < savedQueues.length; i++) {
        if (savedQueues[i].name === name) {
          queueIndex = i;
          break;
        }
      }

      if (queueIndex === -1) {
        return interaction.editReply(
          `The queue with the name of ${name} could not be found!`
        );
      }

      savedQueues.splice(queueIndex, 1);

      savedQueues.length === 0
        ? await clientRedis.del(`save_${interaction.user.id}`)
        : await clientRedis.set(
            `save_${interaction.user.id}`,
            JSON.stringify(savedQueues)
          );

      const deleteEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(`Deleted the queue ${name}`)
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        );

      return interaction.editReply({ embeds: [deleteEmbed] });
    }
  },
};
