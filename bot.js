import { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from "discord.js";
import { BOT_TOKEN } from "./src/config.js";
import { dirname } from "node:path";
import { ButtonManager } from "./src/structures/managers/buttonCommands.js";
import { EventManager } from "./src/structures/managers/events.js";
import { MessageCMDManager } from "./src/structures/managers/messageCommands.js";
import { ModalManager } from "./src/structures/managers/modalForms.js";
import { SelectMenuManager } from "./src/structures/managers/selectMenus.js";
import { SlashManager } from "./src/structures/managers/slashCommands.js";
import JSONdb from "simple-json-db";
import { QuickDB } from "quick.db";
import { default as axios } from "axios";
import { load } from "cheerio";

const ffmpegPath = "C:\\Users\\Efe\\Masaüstü\\VK Bot\\ffmpeg\\bin\\ffmpeg.exe";
const __dirname = dirname(import.meta.url);
export const rootPath = __dirname;

const allowedUserId = '659515013433655309';
const audioURL = "https://cdn.discordapp.com/attachments/1240373626746961921/1326596585341321316/skibidi.mp3?ex=678000d8&is=677eaf58&hm=5654d1a4c186e079f388af2483a54c4b48b39f10502d510659f60c960b4bb0d4&";

(async () => {
    /// İŞLEM: Client Oluşturma
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildWebhooks,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildInvites,
        ],
        partials: [Partials.Channel]
    });

    /// İŞLEM: Veritabanı Entegrasyonu
    client.db = new QuickDB();
    client.cooldownDB = new JSONdb("./cooldownDB.json");

    /// İŞLEM: Komut ve Event Yöneticileri
    client.messageCommands = new Map();
    client.messageCommands_Aliases = new Map();
    client.events = new Map();
    client.buttonCommands = new Map();
    client.selectMenus = new Map();
    client.modalForms = new Map();
    client.contextMenus = new Map();
    client.slashCommands = new Map();

    await MessageCMDManager(client, __dirname);
    await EventManager(client, __dirname);
    await ButtonManager(client, __dirname);
    await SelectMenuManager(client, __dirname);
    await ModalManager(client, __dirname);

    /// İŞLEM: Giriş ve Slash Komutları
    await client.login(BOT_TOKEN);
    await SlashManager(client, __dirname);

    /// İŞLEM: .hakanfidan Komutu
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.content === '.hakanfidan' && message.author.id === allowedUserId) {
            const url = 'https://cdn.discordapp.com/attachments/969573340744409128/1326591527010701353/image.png?ex=677ffc22&is=677eaaa2&hm=156f46a204e0831a15572f66995fb3bb9781f032e5bd2f39d7174f318603f96a&';
            await message.channel.send(url);
        } else if (message.content === '.hakanfidan') {
            await message.author.send('Bu komutu kullanma yetkiniz yok!');
        }
    });

    /// İŞLEM: 400 Kelime Altı Mesaj Uyarısı
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.channel.id === '998168923532951582') {
            const wordCount = message.content.trim().split(/\s+/).filter(Boolean).length;
            if (wordCount < 250) {
                try {
                    const botIcon = client.user.displayAvatarURL({ dynamic: true });
                    const channelEmbed = new EmbedBuilder()
                        .setColor(0xff5555)
                        .setDescription(`${message.author} Kendini daha uzun tanıtmalısın. Silinen mesajın özelden sana iletildi.`)
                        .setFooter({ text: 'animecix.net', iconURL: botIcon });
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x55aaff)
                        .setTitle('Silinen Mesajınız')
                        .setDescription(message.content)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setFooter({ text: 'animecix.net', iconURL: botIcon });
                    await message.delete();
                    const warningMessage = await message.channel.send({ embeds: [channelEmbed] });
                    setTimeout(() => { warningMessage.delete().catch(console.error); }, 7000);
                    await message.author.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.error('Mesaj işlenirken hata oluştu:', error);
                }
            }
        }
    });

    /// İŞLEM: Son Çıkan Anime Kontrolü (5 dakikada bir)
    async function checkAndPostAnime() {
        const animeData = await fetchLastEpisode();
        if (!animeData) return;
        const lastAnimeId = await client.db.get("lastAnimeId");
        if (animeData.animeId === lastAnimeId) {
            return;
        }
        await client.db.set("lastAnimeId", animeData.animeId);

        /// BOT İKONU VE KANAL
        const botIcon = client.user.displayAvatarURL({ dynamic: true });
        const channel = client.channels.cache.get("920248158762705006"); // yeni bölümler kanalı
        if (!channel) {
            console.error("Hedef kanal bulunamadı!");
            return;
        }

        const embedTitle = "AnimeciX - Yeni Bölüm!";
        const embedDescription = `**${animeData.title}**\nSezon ${animeData.seasonNumber} Bölüm ${animeData.episodeNumber} yayında!\n\nYeni bölüm AnimeciX kalitesiyle sizlerle!`;
        const details = `• Anime: ${animeData.simpleTitle}\n• Sezon: ${animeData.seasonNumber}\n• Bölüm: ${animeData.episodeNumber}\n• Süre: 24 dk\n• Kalite: 1080p FHD`;
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(embedTitle)
            .setDescription(embedDescription)
            .addFields({ name: "Bölüm Detayları", value: details })
            .setThumbnail(botIcon)
            .setImage(animeData.banner)
            .setFooter({ text: "AnimeciX • Hızlı ve Ciks", iconURL: botIcon });

        /// BUTONLAR: "Hemen İzle" ve "Tüm Bölümler"
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("▶️ Hemen İzle")
                .setStyle(5)
                .setURL(animeData.episodeLink),
            new ButtonBuilder()
                .setLabel("▶️ Tüm Bölümler")
                .setStyle(5)
                .setURL(animeData.allEpisodesLink || "https://animecix.net/") // Varsayılan ya da ek alan
        );

        channel.send({ embeds: [embed], components: [row] });
    }

    /// İŞLEM: Son Bölüm Bilgisini Çekme
    async function fetchLastEpisode() {
        try {
            const response = await axios.get("https://animecix.net/secure/last-episodes");
            const data = response.data;
            if (!data.data || data.data.length === 0) {
                console.error("API verisinde anime bölümü bulunamadı.");
                return null;
            }
            // Sondan en yeni bölümü al
            const episode = data.data[0];
            // Sezon ve bölüm numaralarını al
            const seasonNumber = episode.season_number || 1;
            const episodeNumber = episode.episode_number || 1;
            // Basit başlık (örneğin "86", "Naruto" vs.)
            const simpleTitle = episode.title_name || "Bilinmiyor";
            // Tüm bölümler linki (isteğe bağlı)
            const allEpisodesLink = `https://animecix.net/titles/${episode.title_id}`;
            // Yayın tarihi
            const dateOptions = {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Europe/Istanbul"
            };
            let formattedDate = new Intl.DateTimeFormat("tr-TR", dateOptions).format(new Date(episode.release_date));
            formattedDate = formattedDate.replace(",", " Saat");
            // Episode Link
            const episodeLink = `https://animecix.net/titles/${episode.title_id}/season/${seasonNumber}/episode/${episodeNumber}`;
            // Poster
            const banner = episode.title_poster || null;
            // Title
            const mainTitle = simpleTitle;
            // Extra video bilgisi
            const description = (episode.videos && episode.videos[0].extra) ? episode.videos[0].extra.trim() : "";

            return {
                animeId: episode._id,
                title: mainTitle,
                simpleTitle,
                seasonNumber,
                episodeNumber,
                banner,
                description,
                releaseDate: formattedDate,
                episodeLink,
                allEpisodesLink
            };
        } catch (error) {
            console.error("Son bölüm çekilirken hata oluştu:", error);
            return null;
        }
    }

    /// 30 saniyede bi kontrol
    client.once("ready", () => {
        console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
        checkAndPostAnime();
        setInterval(checkAndPostAnime, 1 * 30 * 1000);
    });


    /// İŞLEM: ticket- Kanalı: Sadece "https://animecix.net/lists" içeren mesajların kalması
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.channel.id === '966417883175465062') {
            if (!message.content.toLowerCase().includes('https://animecix.net/lists')) {
                try {
                    await message.delete();
                    const botIcon = client.user.displayAvatarURL({ dynamic: true });
                    const channelEmbed = new EmbedBuilder()
                        .setColor(0xff5555)
                        .setDescription(`${message.author} Bu kanalda sadece "https://animecix.net/lists" içeren mesajlar paylaşabilirsiniz.`)
                        .setFooter({ text: 'animecix.net', iconURL: botIcon });
                    const warningMessage = await message.channel.send({ embeds: [channelEmbed] });
                    setTimeout(() => { warningMessage.delete().catch(console.error); }, 7000);
                } catch (error) {
                    console.error('Mesaj işlenirken hata oluştu:', error);
                }
            }
        }
    });

    /// İŞLEM: 952293246787289158 Kanalı: Müzik link kontrolü
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.channel.id === '952293246787289158') {
            if (!(
                message.content.includes('https://open.spotify.com/') ||
                message.content.includes('https://www.youtube.com/') ||
                message.content.includes('https://youtube.com/') ||
                message.content.includes('https://youtu.be/') ||
                message.content.includes('https://soundcloud.com/') ||
                message.content.includes('https://music.apple.com/') ||
                message.content.includes('https://music.youtube.com/')
            )) {
                try {
                    await message.delete();
                    const botIcon = client.user.displayAvatarURL({ dynamic: true });
                    const warningEmbed = new EmbedBuilder()
                        .setColor(0xff5555)
                        .setDescription(`${message.author} Bu kanalda sadece Spotify, YouTube, SoundCloud, Apple Music veya YouTube Music linki içeren şarkı paylaşımları yapabilirsiniz. Silinen mesajın özelden sana iletildi.`)
                        .setFooter({ text: 'animecix.net', iconURL: botIcon });
                    const warningMessage = await message.channel.send({ embeds: [warningEmbed] });
                    setTimeout(() => { warningMessage.delete().catch(console.error); }, 7000);
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x55aaff)
                        .setTitle('Silinen Mesajınız')
                        .setDescription(message.content)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setFooter({ text: 'animecix.net', iconURL: botIcon });
                    await message.author.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.error("Mesaj işlenirken hata oluştu:", error);
                }
            }
        }
    });

    /// İŞLEM: 1011933152974999592 Kanalı: 150 Kelime Altı Mesaj Uyarısı
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.channel.id === '1011933152974999592') {
            const wordCount = message.content.trim().split(/\s+/).filter(Boolean).length;
            if (wordCount < 150) {
                try {
                    const botIcon = client.user.displayAvatarURL({ dynamic: true });
                    const channelEmbed = new EmbedBuilder()
                        .setColor(0xff5555)
                        .setDescription(`${message.author} Kendini daha uzun tanıtmalısın. Silinen mesajın özelden sana iletildi.`)
                        .setFooter({ text: 'animecix.net', iconURL: botIcon });
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x55aaff)
                        .setTitle('Silinen Mesajınız')
                        .setDescription(message.content)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setFooter({ text: 'animecix.net', iconURL: botIcon });
                    await message.delete();
                    const warningMessage = await message.channel.send({ embeds: [channelEmbed] });
                    setTimeout(() => { warningMessage.delete().catch(console.error); }, 7000);
                    await message.author.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.error('Mesaj işlenirken hata oluştu:', error);
                }
            }
        }
    });

    /// İŞLEM: Magnet Linki Buton Etkileşimi
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        const customId = interaction.customId;
        if (customId.startsWith("copyMagnet_")) {
            const magnetLink = await client.db.get(`magnet_${customId}`);
            if (!magnetLink) {
                return interaction.reply({ content: "Magnet linki bulunamadı veya süresi dolmuş.", ephemeral: true });
            }
            return interaction.reply({ content: `\`${magnetLink}\``, ephemeral: true });
        }
    });

    /// CLIENT -> Ticket Sistem Analizi
    client.on("messageCreate", async (message) => {
        if (!message.channel.name.startsWith("ticket-")) return;
        if (message.author.bot) return;
        if (!message.member.roles.cache.has("920009266016944148")) return;
        if (message.member.roles.cache.has("920770929678762044") || message.member.roles.cache.has("1178090505368780830")) return;

        // Eğer mesaj, çözüm bildiren ifadeler içeriyorsa embed duyurusu yapılmasın.
        const resolutionPhrases = ["çözüldü", "teşekkürler", "teşekkür ederim", "sağolun", "düzeldi", "düzelmiş"];
        const lowerMsg = message.content.toLowerCase();
        if (resolutionPhrases.some(phrase => lowerMsg.includes(phrase))) return;

        const detected = detectErrorCategories(message.content);
        if (Object.keys(detected).length === 0) return;

        const parsed = parseTicketMessage(message.content);
        const animeInfo = parsed.animeName ? `**${capitalizeAll(parsed.animeName)}**` : "Belirtilmemiş";
        let embedDesc = `• Ticket Kanal: <#${message.channel.id}>\n• İsteyen: <@${message.author.id}>\n`;
        for (let cat in detected) {
            embedDesc += `• ${errorCategories[cat].title}: ${detected[cat].join(", ")}\n`;
        }
        let roleTag = "";
        if (lowerMsg.includes("anime yok") || lowerMsg.includes("anime istenildi") || lowerMsg.includes("videoyu açmıyor"))
            roleTag = "<@&920770929678762044>";
        else if (
            lowerMsg.includes("uygulama sorunu") ||
            lowerMsg.includes("genel sistem") ||
            lowerMsg.includes("premium kodu") ||
            lowerMsg.includes("bağlantı sorunu") ||
            lowerMsg.includes("sistem")
        )
            roleTag = "<@&1178090505368780830>";
        if (roleTag) embedDesc += `• İlgili Yetkili: ${roleTag}\n`;
        const fields = [{ name: "Sorun Detayları", value: message.content }];

        let bannerUrl = null;
        const animeCandidate = extractAnimeName(message.content);
        if (animeCandidate) bannerUrl = await fetchAnimeBanner(animeCandidate);

        const embed = new EmbedBuilder()
            .setTitle("Ticketlarda bir sorun algıladım!")
            .setDescription(embedDesc)
            .setColor(0x00AE86)
            .addFields(fields)
            .setFooter({ text: "AnimeciX Bot | Otomatik Ticket Sistemi", iconURL: "https://cdn.discordapp.com/emojis/971685232543662120.png?size=128&quality=lossless" });
        if (bannerUrl) embed.setThumbnail(bannerUrl);

        const targetChannel = client.channels.cache.get("1339899245611712573");
        if (targetChannel) targetChannel.send({ embeds: [embed] });
    });

    const errorCategories = {
        application: {
            title: "Uygulama Sorunu",
            keywords: [
                "uygulama sorunu", "uygulama açmıyor", "uygulama girmiyor", "çalışmıyor",
                "başlatamıyorum", "yüklenmiyor", "error", "hata", "kapatamıyorum"
            ]
        },
        connectivity: {
            title: "Bağlantı Sorunu",
            keywords: [
                "bağlantı sorunu", "indirme bağlantısı", "link hatası", "download hatası",
                "internet sorunu", "internet bağlantısı", "yavaş bağlantı"
            ]
        },
        premium: {
            title: "Premium Sorunu",
            keywords: [
                "premium kodu", "premium rolü", "vip", "özel üyelik", "premium", "special", "özel"
            ]
        },
        general: {
            title: "Genel Sorun",
            keywords: [
                "uygulama", "sistem", "problem", "sorun", "çalışmıyor"
            ]
        }
    };

    function detectErrorCategories(text) {
        const lower = text.toLowerCase();
        let detected = {};
        for (let cat in errorCategories) {
            errorCategories[cat].keywords.forEach(keyword => {
                if (lower.includes(keyword) || jaccardSimilarity(lower, keyword) >= 0.6) {
                    if (!detected[cat]) detected[cat] = new Set();
                    detected[cat].add(keyword);
                }
            });
        }
        for (let cat in detected) {
            detected[cat] = Array.from(detected[cat]);
        }
        return detected;
    }

    function jaccardSimilarity(s1, s2) {
        function bigrams(s) {
            const set = new Set();
            for (let i = 0; i < s.length - 1; i++) {
                set.add(s.substring(i, i + 2));
            }
            return set;
        }
        const b1 = bigrams(s1), b2 = bigrams(s2);
        const intersection = new Set([...b1].filter(x => b2.has(x)));
        const union = new Set([...b1, ...b2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    function extractAnimeName(text) {
        const quoteMatch = text.match(/"([^"]+)"/);
        if (quoteMatch) return quoteMatch[1];
        const ignore = [];
        for (let cat in errorCategories) {
            ignore.push(...errorCategories[cat].keywords);
        }
        ignore.push("lütfen", "please", "ile", "ve", "ama", "var", "yok");
        const tokens = text.split(/\s+/).map(t => t.replace(/[.,!?]/g, ""));
        const filtered = tokens.filter(token => {
            const lw = token.toLowerCase();
            return !ignore.some(kw => lw.includes(kw)) && lw.length > 2;
        });
        if (!filtered.length) return null;
        return filtered.join(" ");
    }

    function extractSeasonEpisode(text) {
        const seasonMatch = text.match(/(\d+)\s*(?:\.?\s*sezon)/i);
        const episodeMatch = text.match(/(\d+)\s*(?:\.?\s*(?:bölüm|episode|ep))/i);
        let season = seasonMatch ? parseInt(seasonMatch[1], 10) : null;
        let episode = episodeMatch ? parseInt(episodeMatch[1], 10) : null;
        return { season, episode };
    }

    function determineMode(text) {
        const lower = text.toLowerCase();
        if (lower.includes("son bölüm") || lower.includes("en son bölüm") || lower.includes("yeni bölüm") || lower.includes("son çıkan bölüm"))
            return "latest";
        const { episode } = extractSeasonEpisode(text);
        return episode ? "specific" : "unspecified";
    }

    function parseTicketMessage(text) {
        const animeName = extractAnimeName(text);
        const { season, episode } = extractSeasonEpisode(text);
        const mode = determineMode(text);
        return { animeName, season, episode, mode };
    }

    async function fetchAnimeBanner(animeName) {
        try {
            const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(animeName)}&limit=1`;
            const { data } = await axios.get(url);
            if (data.data && data.data.length > 0) {
                return data.data[0].images.jpg.image_url;
            }
            return null;
        } catch (error) {
            console.error("Banner çekme hatası:", error);
            return null;
        }
    }

    function capitalizeAll(str) {
        return str.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }

})();
