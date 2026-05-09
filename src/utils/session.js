// Stockage en mémoire des sessions actives
// sessions : Map<sessionKey, { sessionNum, guildId, monde, userIds, message, dayUsed }>
// sessionKey = `${guildId}_${sessionNum}`
const sessions = new Map();

// Compteur par guilde : Map<guildId, lastSessionNum>
const sessionCounters = new Map();

function createSession(guildId, monde, userIds, message) {
  const current = sessionCounters.get(guildId) || 0;
  const sessionNum = current + 1;
  sessionCounters.set(guildId, sessionNum);

  const key = `${guildId}_${sessionNum}`;
  sessions.set(key, {
    sessionNum,
    guildId,
    monde: monde || 1,
    userIds: [...userIds],
    message,
    dayUsed: false,
  });
  return { key, sessionNum };
}

function getSession(guildId, sessionNum) {
  return sessions.get(`${guildId}_${sessionNum}`);
}

function getSessionsByGuild(guildId) {
  const result = [];
  for (const [, session] of sessions) {
    if (session.guildId === guildId) result.push(session);
  }
  return result.sort((a, b) => a.sessionNum - b.sessionNum);
}

function deleteSession(guildId, sessionNum) {
  return sessions.delete(`${guildId}_${sessionNum}`);
}

module.exports = { sessions, createSession, getSession, getSessionsByGuild, deleteSession };
