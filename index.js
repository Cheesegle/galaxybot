const { REST, Routes, Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const { JsonDB, Config } = require('node-json-db');
var db = new JsonDB(new Config("galaxy", true, false, '/'));

db.push(`/players/${'3Cheese'}`, {
  planets: [
    {
      x: 200,
      y: 200
    },
    {
      x: 678,
      y: 343
    },
    {
      x: 234,
      y: 635
    }],
  dead: false
});

let TOKEN = process.env['token'];
let CLIENT_ID = '850950666020061234';

const commands = [
  {
    name: 'all',
    description: 'Lists all enemies',
  },
  {
    name: 'add',
    description: 'Add an enemy',
  },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'all') {
    let data = await db.getData(`/players`)
    let embeds = []
    for (let [key, e] in data.entries()) {
      let embed = new EmbedBuilder()
        .setColor(0xfff700)
        .setTitle(key)
      for (let [p, i] of e.p) {
        if (i === 0) {
          embed.addFields({ name: key, value: `Main: ${p.x}, ${p.y}` })
        }
      }
      embeds.push(embed)
    }

    interaction.reply({ embeds: embeds })
  }
});

client.login(TOKEN);