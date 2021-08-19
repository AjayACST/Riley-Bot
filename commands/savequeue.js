"use strict";
const { getRedis, clientRedis } = require("../utils/redis");
const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  name: "savequeue",
  description: "Saves the current queue, or loads a saved queue.",
  args: true,
  usage: "<save | load | list> <queue ID>",
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
      await getRedis(
        `guild_${interaction.guildId}`,
        async function (err, reply) {
          if (err) {
            throw new Error("Error with Redis");
          }
          const serverQueue = JSON.parse(reply);

          if (!serverQueue) {
            return interaction.reply(
              "There is currently no songs in the queue to save!"
            );
          }

          await getRedis(
            `save_${interaction.user.id}`,
            async function (err, reply) {
              if (err) {
                throw new Error("Error with Redis");
              }

              if (reply) {
                const redisSaveQueue = JSON.parse(reply);
                for (let i = 0; i < redisSaveQueue.length; i++) {
                  if (redisSaveQueue[i].name === queueName) {
                    return interaction.reply(
                      `There is already a saved queue called ${queueName}! PLease choose a different name.`
                    );
                  }
                }
                userQueues = JSON.parse(reply);
              }

              const queuePush = {
                name: queueName,
                songs: serverQueue.songs,
              };
              userQueues.push(queuePush);
              clientRedis.set(
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

              return interaction.reply({ embeds: [saveEmbed] });
            }
          );
        }
      );
    } else if (interaction.options.getSubcommand() === "list") {
      await getRedis(
        `save_${interaction.user.id}`,
        async function (err, reply) {
          if (err) {
            throw new Error("Error with Redis");
          }

          if (!reply) {
            return interaction.reply("There are no saved queues!");
          }

          const savedQueues = JSON.parse(reply);
          const size = 10;
          const queueArray = [];

          for (let i = 0; i < savedQueues.length; i += size) {
            queueArray.push(savedQueues.slice(i, i + size));
          }

          let queueCount = 0;
          let embedDesc = "";
          let embedPage = 0;
          let embedPagesArray = [];

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

          await interaction.reply({
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
        }
      );
    } else if (interaction.options.getSubcommand() === "load") {
      await getRedis(
        `save_${interaction.user.id}`,
        async function (err, reply) {
          if (err) {
            throw new Error("Error with Redis.");
          }

          if (!reply) {
            return interaction.reply("You have no queues saved!");
          }
          const name = interaction.options.getString("name");
          const savedQueues = JSON.parse(reply);
          var queueIndex = -1;
          for (let i = 0; i < savedQueues.length; i++) {
            if (savedQueues[i].name === name) {
              queueIndex = i;
              break;
            }
          }

          if (queueIndex === -1) {
            return interaction.reply(
              `The queue with the name of ${name} could not be found!`
            );
          }

          const manager = interaction.client.manager;
          const voiceChannel = interaction.member.voice.channel;

          if (!manager.get(interaction.guildId)) {
            const permissions = voiceChannel.permissionsFor(
              interaction.client.user
            );

            if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
              return interaction.reply(
                "I don't have permission to join or speak in that voice channel!"
              );
            }

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
            if (response.tracks[0].isStream) {
              return interaction.editReply(
                "Sorry, that video is a livestream!"
              );
            }

            const player = manager.create({
              guild: interaction.guildId,
              voiceChannel: voiceChannel.id,
              textChannel: interaction.channelId,
            });

            player.connect();

            var serverQueue = {
              textChannel: interaction.channel,
              voiceChannel: voiceChannel,
              songs: [],
            };

            for (let i = 0; i < savedQueues[queueIndex].songs.length; i++) {
              serverQueue.songs.push(savedQueues[queueIndex].songs[i]);
            }

            clientRedis.set(
              `guild_${interaction.guildId}`,
              JSON.stringify(serverQueue),
              "EX",
              86400
            );
            player.play(response.tracks[0]);
          } else {
            await getRedis(
              `guild_${interaction.guildId}`,
              function (err, reply) {
                if (err) {
                  throw new Error("Error with Redis");
                }

                const serverQueue = JSON.parse(reply);

                for (let i = 0; i < savedQueues[queueIndex].songs.length; i++) {
                  serverQueue.songs.push(savedQueues[queueIndex].songs[i]);
                }

                clientRedis.set(
                  `guild_${interaction.guildId}`,
                  JSON.stringify(serverQueue),
                  "EX",
                  "86400"
                );
              }
            );
          }
        }
      );
    }
  },
};
