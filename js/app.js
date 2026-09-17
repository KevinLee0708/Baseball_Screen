// Firebase 연동 데이터 구조 설계 예시
const scoreboardData = {
  awayTeam: { name: "AWAY", shortName: "AWAY" },
  homeTeam: { name: "HOME ", shortName: "HOME" },
  
  awayLineup: [
    { num: 1, name: "송성문", pos: "2B", avg: ".241" },
    { num: 2, name: "이주형", pos: "CF", avg: ".308" },
    { num: 3, name: "최주환", pos: "DH", avg: ".315" },
    { num: 4, name: "카디네스", pos: "1B", avg: ".327" },
    { num: 5, name: "박주홍", pos: "RF", avg: ".275", active:true },
    { num: 6, name: "장재영", pos: "LF", avg: ".100"},
    { num: 7, name: "어준서", pos: "SS", avg: ".333" },
    { num: 8, name: "김건희", pos: "C", avg: ".233" },
    { num: 9, name: "전태현", pos: "3B", avg: ".283" },
    { num: 0, name: "김선기", pos: "P", avg: "3.38", isPitcher: true }
  ],

  currentBatter: {
    num: "61",
    name: "장재영",
    pos: "OUTFIELDER",
    todayRecord: "삼진",
    season: [
      { label: "타수", val: "10" },
      { label: "타율", val: ".100" },
      { label: "타점", val: "1" },
      { label: "홈런", val: "0" },
      { label: "안타", val: "1" },
      { label: "도루", val: "0" },
      { label: "출루율", val: ".250" },
      { label: "장타율", val: ".100" }
    ]
  },

  score: {
    away: [0, 0, 0, 0, 0, 2, 2, "", "", "", "", ""],
    awayStats: { R: 4, H: 8, E: 1, B: 1 },
    home: [1, 1, 0, 3, 1, 0, 0, "", "", "", "", ""],
    homeStats: { R: 6, H: 14, E: 0, B: 2 },
    currentInning: 7 // 7회 말 공격 중
  },

  runners: {
    base1: "한지윤",
    base2: "이주형", // 2루 주자 존재
    base3: "노시환"
  },

  bso: { balls: 1, strikes: 2, outs: 1 }
};

// UI 렌더링 함수 (Firebase Snapshot 수신 시 이 함수를 호출)
function updateScoreboard(data) {
  // 1. 원정팀 라인업 출력
  const lineupEl = document.getElementById("away-lineup");
  lineupEl.innerHTML = data.awayLineup.map(item => `
    <li class="${item.active ? 'active-batter' : ''} ${item.isPitcher ? 'pitcher-row' : ''}">
      <span class="num">${item.num || ''}</span>
      <span class="name">${item.name}</span>
      <span class="pos">${item.pos}</span>
      <span class="avg">${item.avg}</span>
    </li>
  `).join("");

  // 2. 현재 타자 시즌 정보 출력
  const seasonGridEl = document.getElementById("season-stats-grid");
  seasonGridEl.innerHTML = data.currentBatter.season.map(s => `
    <div class="s-item"><span>${s.label}</span><strong>${s.val}</strong></div>
  `).join("");

  // 3. 스코어보드 표 출력
  const tbodyEl = document.getElementById("scoreboard-tbody");
  tbodyEl.innerHTML = `
    <tr>
      <td class="team-td">${data.awayTeam.shortName}</td>
      ${data.score.away.map(s => `<td>${s}</td>`).join("")}
      <td class="stat-td">${data.score.awayStats.R}</td>
      <td class="stat-td">${data.score.awayStats.H}</td>
      <td class="stat-td">${data.score.awayStats.E}</td>
      <td class="stat-td">${data.score.awayStats.B}</td>
    </tr>
    <tr class="home-row">
      <td class="team-td">${data.homeTeam.shortName}</td>
      ${data.score.home.map((s, idx) => `
        <td class="${idx + 1 === data.score.currentInning ? 'active-inning' : ''}">${s}</td>
      `).join("")}
      <td class="stat-td">${data.score.homeStats.R}</td>
      <td class="stat-td">${data.score.homeStats.H}</td>
      <td class="stat-td">${data.score.homeStats.E}</td>
      <td class="stat-td">${data.score.homeStats.B}</td>
    </tr>
  `;

  // 4. 주자 표시 업데이트
  updateBase("base-1", "runner-1-name", data.runners.base1);
  updateBase("base-2", "runner-2-name", data.runners.base2);
  updateBase("base-3", "runner-3-name", data.runners.base3);
}

function updateBase(baseId, nameId, runnerName) {
  const baseEl = document.getElementById(baseId);
  const nameEl = document.getElementById(nameId);
  if (runnerName) {
    baseEl.classList.add("occupied");
    nameEl.textContent = runnerName;
  } else {
    baseEl.classList.remove("occupied");
    nameEl.textContent = "";
  }
}

// 최초 렌더링 실행
document.addEventListener("DOMContentLoaded", () => {
  updateScoreboard(scoreboardData);
});