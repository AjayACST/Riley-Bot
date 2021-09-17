import { Client } from "../client";
import { SlashCommandBuilder } from "@discordjs/builders";
import {
    CommandInteraction,
    StageChannel,
    TextChannel,
    VoiceChannel,
} from "discord.js";

export abstract class Command {
    client: Client;
    abstract name: string;
    abstract description: string;
    abstract args: boolean;
    abstract usage: string;
    abstract guildOnly: boolean;
    abstract data: Omit<
        SlashCommandBuilder,
        "addSubcommand" | "addSubcommandGroup"
    >;
    abstract execute: (interaction: CommandInteraction) => Promise<void>;

    public constructor(client: Client) {
        this.client = client;
    }

    /**
     * Check if the bot has permissions to play in the voice channel.
     *
     * @param voiceChannel the voice channel to join
     * @returns a string with the issue preventing the bot from connecting, else
     *          null if there are no issues
     */
    protected hasPermissionsJoin(voiceChannel: VoiceChannel | StageChannel): string {
        const permissions = voiceChannel.permissionsFor(this.client.user);
        if (!permissions.has("CONNECT")) {
            return "I need the permissions to join your voice channel!";
        } else if (!permissions.has("SPEAK")) {
            return "I need the permissions to speak in your voice channel!";
        }
        return null;
    }

    /**
     * 
     * Check if the bot has permissions to send a message in the channel.
     * 
     * @param textChannel the text channel to send the message in
     * @returns a string with the issue preventing the bot from sending a message, else
     *          null if there are no issues
     */
    protected hasPermissionsSend(textChannel: TextChannel): string {
        const permissions = textChannel.permissionsFor(this.client.user);
        if (!permissions.has("SEND_MESSAGES")) {
            return "I need the permissions to send messages in this channel!";
        } else if (!permissions.has("EMBED_LINKS")) {
            return "I need the permissions to send embeds in this channel!";
        }
        return null;
    }