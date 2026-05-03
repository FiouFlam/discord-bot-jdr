// Stockage en mémoire des sessions actives
// sessions : Map<guildId, { userIds: string[], message: Message | null }>
const sessions = new Map();

module.exports = { sessions };
