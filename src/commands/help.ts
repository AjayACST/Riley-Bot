import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { Command } from "../types/Command";

export default class Help extends Command {
  name: "help";
  description: "List's all available commands and info for the commands.";
  usage: "[command name]";
  args = true;
  guildOnly = false;
  voice = false;

  data = new SlashCommandBuilder()
    .setName(this.name)
    .setDescription(this.description)
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Name of the command you want help for.")
    );

  execute = async (interaction: CommandInteraction) => {
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
      commands.forEach((command: Command) => {
        if (!command.usage) {
          helpEmbed.addField(`/${command.name}`, command.description);
        } else {
          helpEmbed.addField(
            `/${command.name} ${command.usage}`,
            command.description
          );
        }
      });

      await interaction.user.send({ embeds: [helpEmbed] });
      if (interaction.channel.type === "DM") {
        return;
      }
      try {
        interaction.editReply("I've sent you a DM with all my commands!");
      } catch (_error: any) {
        interaction.editReply(
          "it seems like I can't DM you! Do you have DMs disabled?"
        );
      }
      return;
    }

    const name = commandHelp.value;
    const command = commands.get(name);

    if (!command) {
      interaction.editReply("That's not a valid command!");
      return;
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
      helpCommandEmbed.addField("Usage", `/${command.name}`);
    } else {
      helpCommandEmbed.addField("Usage", `/${command.name} ${command.usage}`);
    }

    interaction.editReply({ embeds: [helpCommandEmbed] });
  };
}
