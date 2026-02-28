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
      // EMBEDS
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

      const embed2 = {
        title: "📘 Passo 1",
        description: "Entre no jogo e abra o painel de verificação clicando no botão abaixo.",
        image: { url: "https://media.discordapp.net/attachments/1477369538600501319/1477369721635471534/image.png?ex=69a48345&is=69a331c5&hm=b3d67315a79116f437532edb48d9a6bbb2fb38a694af238f4067ddcf1ff43a39&=&format=webp&quality=lossless" },
        color: 0x2b2d31
      };

      const embed3 = {
        title: "📘 Passo 2",
        description: "Copie o código que foi enviado.",
        image: { url: "https://media.discordapp.net/attachments/1477369538600501319/1477369721941921804/content.png?ex=69a48345&is=69a331c5&hm=412c9bac314a195d29bee5b9390818f5a0b59459ff94c7b1640e8da58b6184ce&=&format=webp&quality=lossless" },
        color: 0x2b2d31
      };

      const embed4 = {
        title: "📘 Passo 3",
        description: "Cole o código no campo indicado.",
        image: { url: "https://media.discordapp.net/attachments/1477369538600501319/1477369722247971048/Sem_titulo2.png?ex=69a48345&is=69a331c5&hm=0c0a80e109d1c964d03dc638bbd7f02eb5b5b45347fc71a910ad48f5d004d9c8&=&format=webp&quality=lossless" },
        color: 0x2b2d31
      };

      const embed5 = {
        title: "📘 Finalização",
        description: "Clique no botão 'Verificar' e pronto.",
        image: { url: "https://media.discordapp.net/attachments/1477369538600501319/1477369722570801222/Sem_titulo.png?ex=69a48346&is=69a331c6&hm=8a841890697d3d584e2b485c4b8a883fb3f84b02d81cd8d0d0e1bcdae7483ed0&=&format=webp&quality=lossless" },
        color: 0x2b2d31
      };

      // =====================
      // ENVIO DOS EMBEDS
      // =====================

      await ticket.send({ content: `${interaction.user}`, embeds: [embed1] });

      // Função auxiliar para enviar embed e depois imagem
      async function sendEmbedWithImage(ticket, embed) {
        const { image, ...embedNoImage } = embed;
        if (embedNoImage) await ticket.send({ embeds: [embedNoImage] });
        if (image) await ticket.send({ content: image.url });
      }

      await sendEmbedWithImage(ticket, embed2);
      await sendEmbedWithImage(ticket, embed3);
      await sendEmbedWithImage(ticket, embed4);
      await sendEmbedWithImage(ticket, embed5);

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
