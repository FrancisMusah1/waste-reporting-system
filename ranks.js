const RANKS = [
    { name: "Community Voice", emoji: "🌱", minPoints: 0 },
    { name: "Neighborhood Guardian", emoji: "🛡️", minPoints: 50 },
    { name: "Sanitation Champion", emoji: "🏆", minPoints: 150 },
    { name: "Accra Clean-Up Hero", emoji: "⭐", minPoints: 350 },
    { name: "City Sanitation Legend", emoji: "👑", minPoints: 700 },
  ];
  
  function getRankForPoints(points) {
    let current = RANKS[0];
    for (const rank of RANKS) {
      if (points >= rank.minPoints) current = rank;
    }
    return current;
  }
  
  module.exports = { RANKS, getRankForPoints };