require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const express = require('express');
const mongoose = require('mongoose');

// =======================
// DISCORD CLIENT
// =======================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =======================
// MONGODB
// =======================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🗄️ MongoDB conectado"))
  .catch(err => console.error("Erro MongoDB:", err));

const verificationSchema = new mongoose.Schema({
  discordId: String,
  robloxId: String,
  code: String,
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Verification = mongoose.model("Verification", verificationSchema);

// =======================
// REGISTRAR SLASH COMMAND
// =======================

const commands = [
  new SlashCommandBuilder()
    .setName('painelverificacao')
    .setDescription('Enviar painel de verificação')
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal onde o painel será enviado')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommands() {
  try {
    console.log("🔄 Registrando slash command...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash command registrado.");
  } catch (error) {
    console.error(error);
  }
}

// =======================
// INTERAÇÕES
// =======================

client.on('interactionCreate', async (interaction) => {

  // SLASH
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'painelverificacao') {

      const canal = interaction.options.getChannel('canal');

      const embed = {
        title: '🔐 Painel de Verificação',
        description: 'Clique no botão abaixo para iniciar sua verificação.',
        color: 0x2b2d31
      };

      const row = {
        type: 1,
        components: [
          {
            type: 2,
            label: 'Começar Verificação',
            style: 1,
            custom_id: 'start_verification'
          }
        ]
      };

      await canal.send({ embeds: [embed], components: [row] });

      await interaction.reply({ content: '✅ Painel enviado!', flags: 64 });
    }
  }

  // BOTÃO
  if (interaction.isButton()) {

    if (interaction.customId === 'start_verification') {

      const guild = interaction.guild;

      // VERIFICAR SE JÁ TEM TICKET
      const existing = guild.channels.cache.find(
        c => c.name === `verificacao-${interaction.user.id}`
      );

      if (existing) {
        return interaction.reply({
          content: `Você já possui um ticket aberto: ${existing}`,
          flags: 64
        });
      }

      // CRIAR TICKET
      const ticket = await guild.channels.create({
        name: `verificacao-${interaction.user.id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

      // GERAR CÓDIGO
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await Verification.create({
        discordId: interaction.user.id,
        code: code
      });

      const embed = {
        title: '🔐 Verificação',
        description:
`Olá ${interaction.user},

Seja bem-vindo ao nosso painel de verificação!

⚠️ Este código pode ser usado apenas uma vez.
Não compartilhe com ninguém.

Seu código é:

\`\`\`
${code}
\`\`\`
`,
        color: 0x2b2d31
      };

      await ticket.send({ content: `${interaction.user}`, embeds: [embed] });

      await interaction.reply({
        content: `✅ Ticket criado: ${ticket}`,
        flags: 64
      });
    }
  }

});

// =======================
// API EXPRESS
// =======================

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API online 🚀');
});

app.post('/api/redeem', async (req, res) => {

  const { code, robloxId } = req.body;

  if (!code || !robloxId) {
    return res.status(400).json({ success: false });
  }

  const verification = await Verification.findOne({ code });

  if (!verification || verification.used) {
    return res.status(400).json({ success: false });
  }

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(verification.discordId);

    await member.roles.add(process.env.VERIFIED_ROLE_ID);

    const ticketChannel = guild.channels.cache.find(
      c => c.name === `verificacao-${verification.discordId}`
    );

    if (ticketChannel) {
      await ticketChannel.delete();
    }

    verification.used = true;
    verification.robloxId = robloxId;
    await verification.save();

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }

});

// =======================
// START SERVIDOR
// =======================

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🌐 API rodando na porta ${PORT}`);
});

// =======================
// READY
// =======================

client.once('clientReady', async () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
  await registerCommands();
});

// =======================
// LOGIN
// =======================

client.login(process.env.TOKEN);
