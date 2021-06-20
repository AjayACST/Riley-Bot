const fs = require('fs');
const Discord = require('discord.js');
const { Manager } = require('erela.js');

const {prefix, token, lavalinkIP, lavalinkPort, lavalinkPassword} = require('./config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();

client.manager = new Manager({
    nodes: [
        {
            host: lavalinkIP,
            port: lavalinkPort,
            password: lavalinkPassword
        }
    ],
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload)
    },
})
    .on("nodeConnect", node => console.log(`Node ${node.options.identifier} connected`))
    .on("nodeError", (node, error) => console.log(`Node ${node.options.identifier} had an error: ${error.message}`));

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.manager.init(client.user.id);
    client.user.setActivity(`for ${prefix}help`, { type: 'WATCHING' });
});

client.on("raw", (d) => client.manager.updateVoiceState(d));

client.on('message',async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    if (command.guildOnly && message.channel.type === 'dm') {
        return message.reply ("I can't execute this command inside DMs!")
    }

    if (command.args && !args.length) {
        const argsEmbed = new Discord.MessageEmbed()
            .setColor('#ed1c24')
            .setTitle('Incorrect Usage!')
            .setAuthor(client.user.username, client.user.avatarURL())
            .addField(`The proper usage for the ${command.name} command is:`, `${prefix}${command.name} ${command.usage}`)

        return message.channel.send(argsEmbed)
    }

    try {
        await command.execute(message, args);
    } catch (err) {
        console.error(err)
        message.reply('There was an error trying to execute that command!');
    }
})

client.login(token)