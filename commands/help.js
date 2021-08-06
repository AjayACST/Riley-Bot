"use strict";
const { prefix } = require("../config.json"); //skipcq: JS-0266
const Discord = require("discord.js");

module.exports = {
  name: "help",
  description: "List's all available commands and info for the commands.",
  usage: "[command name]",
  execute(interaction) {
    const { commands } = interaction.client;

    const commandHelp = interaction.options.get("command");

    if (!commandHelp) {
      const helpEmbed = new Discord.MessageEmbed()
        .setColor("#ed1c24")
        .setTitle(`${interaction.client.user.username} Help`)
        .setAuthor(
          interaction.client.user.username,
          interaction.client.user.avatarURL()
        )
        .setDescription(
          `Below are all avilable commands for ${interaction.client.user.username}`
        );
      commands.forEach((command) => {
        if (!command.usage) {
          helpEmbed.addField(`${prefix}${command.name}`, command.description);
        } else {
          helpEmbed.addField(
            `${prefix}${command.name} ${command.usage}`,
            command.description
          );
        }
      });

      return interaction.user
        .send({ embeds: [helpEmbed] })
        .then(() => {
          if (interaction.channel.type === "dm") {
            return;
          }
          interaction.reply("I've sent you a DM with all my commands!");
        })
        .catch((error) => {
          interaction.reply(
            "it seems like I can't DM you! Do you have DMs disabled?"
          );
        });
    }

    const name = commandHelp.value;
    const command = commands.get(name);

    if (!command) {
      return interaction.reply("That's not a valid command!");
    }

    const helpCommandEmbed = new Discord.MessageEmbed()
      .setColor("#ed1c24")
      .setTitle(`Help For Command ${command.name}`)
      .setAuthor(
        interaction.client.user.username,
        interaction.client.user.avatarURL()
      )
      .setDescription(`Usage for command ${command.name}.`)
      .addFields(
        { name: "Command Name", value: command.name },
        { name: "Description", value: command.description }
      );

    if (!command.usage) {
      helpCommandEmbed.addField("Usage", `${prefix}${command.name}`);
    } else {
      helpCommandEmbed.addField(
        "Usage",
        `${prefix}${command.name} ${command.usage}`
      );
    }

    interaction.reply({ embeds: [helpCommandEmbed] });
  },
};
