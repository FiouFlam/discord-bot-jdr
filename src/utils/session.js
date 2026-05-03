// Stockage en mémoire des sessions actives
// sessions : Map<guildId, string[]> (liste des userIds de la session)
const sessions = new Map();

module.exports = { sessions };
