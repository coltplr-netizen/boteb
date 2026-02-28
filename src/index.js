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


// ==========================
// CLIENT
// ==========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});


// ==========================
// MONGODB
// ==========================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🗄️ MongoDB conectado"))
  .catch(err => console.error("❌ Erro MongoDB:", err));

const verificationSchema = new mongoose.Schema({
  discordId: String,
  robloxId: String,
  code: String,
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Verification = mongoose.model("Verification", verificationSchema);


// ==========================
// SLASH COMMAND
// ==========================

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
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash command registrado.");
}


// ==========================
// INTERAÇÕES
// ==========================

client.on('interactionCreate', async (interaction) => {

  // =====================
  // SLASH
  // =====================

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'painelverificacao') {

      const canal = interaction.options.getChannel('canal');

      const embed = {
        title: '🔐 Painel Oficial de Verificação',
        description: 'Clique no botão abaixo para iniciar sua verificação.',
        color: 0x2b2d31
      };

      const row = {
        type: 1,
        components: [{
          type: 2,
          label: 'Começar Verificação',
          style: 1,
          custom_id: 'start_verification'
        }]
      };

      await canal.send({ embeds: [embed], components: [row] });

      await interaction.reply({
        content: '✅ Painel enviado com sucesso.',
        flags: 64
      });
    }
  }


  // =====================
  // BOTÃO
  // =====================

  if (interaction.isButton()) {

    if (interaction.customId === 'start_verification') {

      const guild = interaction.guild;

      // impedir discord já verificado
      const alreadyVerified = await Verification.findOne({
        discordId: interaction.user.id,
        used: true
      });

      if (alreadyVerified) {
        return interaction.reply({
          content: "❌ Você já está verificado.",
          flags: 64
        });
      }

      // impedir ticket duplicado
      const existing = guild.channels.cache.find(
        c => c.name === `verificacao-${interaction.user.id}`
      );

      if (existing) {
        return interaction.reply({
          content: `Você já possui um ticket aberto: ${existing}`,
          flags: 64
        });
      }

      // criar ticket na categoria correta
      const ticket = await guild.channels.create({
        name: `verificacao-${interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: process.env.CATEGORY_ID,
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

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await Verification.create({
        discordId: interaction.user.id,
        code: code
      });

      // =====================
      // EMBED 1 - CÓDIGO
      // =====================

      const embed1 = {
        title: "🔐 Seu Código de Verificação",
        description: `
Olá ${interaction.user},

Este código é individual e pode ser utilizado apenas uma vez.

Não compartilhe com ninguém.

\`\`\`
${code}
\`\`\`
`,
        color: 0x2b2d31
      };

      // =====================
      // EMBED 2 - TUTORIAL 1
      // =====================

      const embed2 = {
        title: "📘 Passo 1",
        description: "Entre no jogo e abra o painel de verificação apertando no botão abaixo.",
        image: {
          url: "https://cdn.discordapp.com/attachments/1477382168404693093/1477382969235603538/image.png?ex=69a48f9c&is=69a33e1c&hm=3b268cd62aaa2bc7bab32f804daa9244dc6765c7503ebb2466580ce05c04b41a&"
        },
        color: 0x2b2d31
      };

      // =====================
      // EMBED 3 - TUTORIAL 2
      // =====================

      const embed3 = {
        title: "📘 Passo 2",
        description: "Copie o código que foi enviado.",
        image: {
          url: "https://cdn.discordapp.com/attachments/1477378700600283326/1477379476387270747/image.png?ex=69a48c5b&is=69a33adb&hm=0504ef49e0116f9d2f8c94c1420eb24c361e97b7bf43b60f132aff2932b6d2e3&"
        },
        color: 0x2b2d31
      };

      // =====================
      // EMBED 4 - TUTORIAL 3
      // =====================

      const embed4 = {
        title: "📘 Passo 3",
        description: "Coloque o código no campo indicado.",
        image: {
          url: "https://cdn.discordapp.com/attachments/1477382168404693093/1477382332326351112/image.png?ex=69a48f04&is=69a33d84&hm=3419f85159bd1ff0241d61ef7a64e1232f441e20e5a901286915215805cfd846&"
        },
        color: 0x2b2d31
      };

      // =====================
      // EMBED 5 - TUTORIAL 4
      // =====================

      const embed5 = {
        title: "📘 Finalização",
        description: "Aperte no botão 'Verificar' e pronto.",
        image: {
          url: "https://cdn.discordapp.com/attachments/1477382168404693093/1477382593849852005/image.png?ex=69a48f42&is=69a33dc2&hm=50458dcf0d794ba491e4cf5ac5f6599d7e113cd52ea28188c0a1ba225a730ca1&"
        },
        color: 0x2b2d31
      };

      await ticket.send({ content: `${interaction.user}`, embeds: [embed1] });
      await ticket.send({ embeds: [embed2] });
      await ticket.send({ embeds: [embed3] });
      await ticket.send({ embeds: [embed4] });
      await ticket.send({ embeds: [embed5] });

      await interaction.reply({
        content: `✅ Ticket criado: ${ticket}`,
        flags: 64
      });
    }
  }

});


// ==========================
// API EXPRESS
// ==========================

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send("API online 🚀");
});

app.post('/api/redeem', async (req, res) => {

  const { code, robloxId } = req.body;

  if (!code || !robloxId)
    return res.status(400).json({ success: false });

  const verification = await Verification.findOne({ code });

  if (!verification || verification.used)
    return res.status(400).json({ success: false });

  // impedir roblox já vinculado
  const existingRoblox = await Verification.findOne({
    robloxId: robloxId,
    used: true
  });

  if (existingRoblox)
    return res.status(400).json({ success: false });

  try {

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(verification.discordId);

    await member.roles.add(process.env.VERIFIED_ROLE_ID);

    const ticketChannel = guild.channels.cache.find(
      c => c.name === `verificacao-${verification.discordId}`
    );

    if (ticketChannel)
      await ticketChannel.delete();

    verification.used = true;
    verification.robloxId = robloxId;
    await verification.save();

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }

});


// ==========================
// START
// ==========================

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🌐 API rodando na porta ${PORT}`);
});

client.once('clientReady', async () => {
  console.log(`🤖 Online como ${client.user.tag}`);
  await registerCommands();
});

client.login(process.env.TOKEN);
