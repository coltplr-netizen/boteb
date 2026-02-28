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
// FUNÇÃO AUXILIAR PARA ENVIAR EMBED + IMAGEM FORA
// ==========================

async function sendEmbedWithImage(ticket, embed) {
  const { image, ...embedNoImage } = embed;
  if (embedNoImage) await ticket.send({ embeds: [embedNoImage] });
  if (image) await ticket.send({ content: image.url });
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
        ephemeral: true
      });
    }
  }

  // =====================
  // BOTÃO
  // =====================

  if (interaction.isButton()) {

    if (interaction.customId === 'start_verification') {

      const guild = interaction.guild;

      // RESPONDE IMEDIATAMENTE PARA EVITAR ERRO "INTERACTION FAILED"
      await interaction.deferReply({ ephemeral: true });

      // impedir discord já verificado
      const alreadyVerified = await Verification.findOne({
        discordId: interaction.user.id,
        used: true
      });

      if (alreadyVerified) {
        return interaction.editReply({
          content: "❌ Você já está verificado."
        });
      }

      // impedir ticket duplicado
      const existing = guild.channels.cache.find(
        c => c.name === `verificacao-${interaction.user.id}`
      );

      if (existing) {
        return interaction.editReply({
          content: `Você já possui um ticket aberto: ${existing}`
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

      // gera código único
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
        image: { url: "https://cdn.discordapp.com/attachments/1477372605949280256/1477373774759465133/image.png?ex=69a4870c&is=69a3358c&hm=63cefb4faa89f1c74913a7ee8ff11e43fe68ee680f28348b778e211f234e31d5&" },
        color: 0x2b2d31
      };

      const embed3 = {
        title: "📘 Passo 2",
        description: "Copie o código que foi enviado.",
        image: { url: "https://cdn.discordapp.com/attachments/1477377208694739167/1477377996766707733/image.png?ex=69a48afa&is=69a3397a&hm=34934fb3e4e9adce077653f66d2bcc874346e50a64f82eec49c38f9757a5037e&" },
        color: 0x2b2d31
      };

      const embed4 = {
        title: "📘 Passo 3",
        description: "Cole o código no campo indicado.",
        image: { url: "https://cdn.discordapp.com/attachments/1477374566341808309/1477376095404818533/image.png?ex=69a48935&is=69a337b5&hm=76f5a862314017cf415de6374648762093e903fc708f24008d1f58948025eec5&" },
        color: 0x2b2d31
      };

      const embed5 = {
        title: "📘 Finalização",
        description: "Clique no botão 'Verificar' e pronto.",
        image: { url: "https://cdn.discordapp.com/attachments/1477374566341808309/1477376095857934529/image.png?ex=69a48935&is=69a337b5&hm=367c3e7c55c30de01db27ecd4fa24ab510d351f12cee50a1b7e837ecd9a98693&" },
        color: 0x2b2d31
      };

      // =====================
      // ENVIO DOS EMBEDS E IMAGENS
      // =====================

      await ticket.send({ content: `${interaction.user}`, embeds: [embed1] });

      await sendEmbedWithImage(ticket, embed2);
      await sendEmbedWithImage(ticket, embed3);
      await sendEmbedWithImage(ticket, embed4);
      await sendEmbedWithImage(ticket, embed5);

      // finaliza interação do botão
      await interaction.editReply({
        content: `✅ Ticket criado: ${ticket}`
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
