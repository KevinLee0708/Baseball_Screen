import { db } from "./firebase.js";
import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// Firebase 경기 연결
// ============================================================

const ROOM_COLLECTION = "baseball";

const params = new URLSearchParams(window.location.search);
const roomCode = params.get("room");

if (!roomCode || !/^\d{6}$/.test(roomCode)) {
  alert("올바른 경기 코드가 없습니다.");
  throw new Error("Invalid room code");
}

const roomRef = doc(db, ROOM_COLLECTION, roomCode);


// ============================================================
// 현재 경기 데이터
// ============================================================

let scoreboardData = null;


// ============================================================
// 이전 타자 및 투수 정보를 추적
// ============================================================

let previousBatterName = "";
let previousPitcherName = "";


// ============================================================
// Web Speech API (TTS)
// ============================================================

function speakAnnouncement(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "ko-KR";
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}


// ============================================================
// 진행 시간 계산
// ============================================================

function calculateGameTime(startTimeStr) {
  if (!startTimeStr) return "00:00";

  const now = new Date();

  const [startHour, startMin] =
    startTimeStr.split(":").map(Number);

  const start = new Date();

  start.setHours(
    startHour,
    startMin,
    0,
    0
  );

  let diffMs = now - start;

  if (diffMs < 0) {
    diffMs = 0;
  }

  const totalMinutes =
    Math.floor(diffMs / (1000 * 60));

  const hours = String(
    Math.floor(totalMinutes / 60)
  ).padStart(2, "0");

  const minutes = String(
    totalMinutes % 60
  ).padStart(2, "0");

  return `${hours}:${minutes}`;
}


// ============================================================
// Firebase 실시간 경기 데이터 수신
// ============================================================

function listenGame() {
  console.log(
    `[Scoreboard] 경기 연결 중: ${roomCode}`
  );

  onSnapshot(
    roomRef,

    (snapshot) => {
      if (!snapshot.exists()) {
        console.error(
          "[Scoreboard] 존재하지 않는 경기입니다."
        );

        return;
      }

      const data = snapshot.data();

      console.log(
        "[Scoreboard] Firestore 데이터:",
        data
      );

      if (!data.gameState) {
        console.error(
          "[Scoreboard] gameState가 없습니다."
        );

        return;
      }

      scoreboardData = data.gameState;

      console.log(
        "[Scoreboard] gameState 업데이트:",
        scoreboardData
      );

      updateScoreboard(scoreboardData);
    },

    (error) => {
      console.error(
        "[Scoreboard] Firebase 연결 실패:",
        error
      );
    }
  );
}


// ============================================================
// 스코어보드 렌더링
// ============================================================

function updateScoreboard(data) {

  // 데이터가 아직 들어오지 않은 경우
  if (!data) {
    console.warn(
      "[Scoreboard] 렌더링할 데이터가 없습니다."
    );

    return;
  }


  // ----------------------------------------------------------
  // 기본 데이터 검사
  // ----------------------------------------------------------

  if (!data.awayTeam || !data.homeTeam) {
    console.error(
      "[Scoreboard] 팀 데이터가 없습니다.",
      data
    );

    return;
  }

  if (!data.score) {
    console.error(
      "[Scoreboard] score 데이터가 없습니다.",
      data
    );

    return;
  }


  // ----------------------------------------------------------
  // 공격 / 수비 팀
  // ----------------------------------------------------------

  const offenseTeam =
    data.isTop
      ? data.awayTeam
      : data.homeTeam;

  const defenseTeam =
    data.isTop
      ? data.homeTeam
      : data.awayTeam;


  // ----------------------------------------------------------
  // 좌 / 우 패널 렌더링
  // ----------------------------------------------------------

  const awayPanel =
    document.getElementById("away-panel");

  const homePanel =
    document.getElementById("home-panel");


  if (awayPanel) {
    awayPanel.innerHTML =
      data.isTop
        ? renderLineupHTML(
            data.awayTeam,
            true
          )
        : renderDefenseHTML(
            data.awayTeam,
            true
          );
  }


  if (homePanel) {
    homePanel.innerHTML =
      !data.isTop
        ? renderLineupHTML(
            data.homeTeam,
            false
          )
        : renderDefenseHTML(
            data.homeTeam,
            false
          );
  }


  // ----------------------------------------------------------
  // 현재 타자
  // ----------------------------------------------------------

  if (
    !offenseTeam.lineup ||
    offenseTeam.lineup.length === 0
  ) {
    console.warn(
      "[Scoreboard] 타순 데이터가 없습니다."
    );

    return;
  }


  const currentBatter =
    offenseTeam.lineup.find(
      item => item.active
    ) ||
    offenseTeam.lineup[0];


  if (!currentBatter) {
    console.warn(
      "[Scoreboard] 현재 타자를 찾을 수 없습니다."
    );

    return;
  }


  const currentBatterNum =
    document.getElementById(
      "current-batter-num"
    );

  const currentBatterTeam =
    document.getElementById(
      "current-batter-team"
    );

  const currentBatterPos =
    document.getElementById(
      "current-batter-pos"
    );

  const batterBackNum =
    document.getElementById(
      "batter-back-num"
    );

  const batterName =
    document.getElementById(
      "batter-name"
    );


  if (currentBatterNum) {
    currentBatterNum.textContent =
      currentBatter.backNum || "";
  }

  if (currentBatterTeam) {
    currentBatterTeam.textContent =
      offenseTeam.shortName || "";
  }

  if (currentBatterPos) {
    currentBatterPos.textContent =
      currentBatter.pos || "";
  }

  if (batterBackNum) {
    batterBackNum.textContent =
      currentBatter.backNum || "";
  }

  if (batterName) {
    batterName.textContent =
      currentBatter.name || "";
  }


  // ----------------------------------------------------------
  // 오늘 기록
  // ----------------------------------------------------------

  const todayRecordEl =
    document.getElementById(
      "today-record-text"
    );


  if (todayRecordEl) {

    if (
      Array.isArray(
        currentBatter.todayRecord
      )
    ) {

      todayRecordEl.textContent =
        currentBatter.todayRecord.join(" ");

    } else {

      todayRecordEl.textContent =
        currentBatter.todayRecord || "-";
    }
  }


  // ----------------------------------------------------------
  // 시즌 기록
  // ----------------------------------------------------------

  const seasonGridEl =
    document.getElementById(
      "season-stats-grid"
    );


  if (seasonGridEl) {

    if (
      Array.isArray(
        currentBatter.season
      )
    ) {

      seasonGridEl.innerHTML =
        currentBatter.season
          .map(
            s => `
              <div class="s-item">
                <span>${s.label}</span>
                <strong>${s.val}</strong>
              </div>
            `
          )
          .join("");

    } else {

      seasonGridEl.innerHTML = "";
    }
  }


  // ==========================================================
  // 투수
  // ==========================================================

  const currentPitcher =
    defenseTeam.pitcher;


  if (!currentPitcher) {

    console.warn(
      "[Scoreboard] 현재 투수 데이터가 없습니다."
    );

  } else {

    // --------------------------------------------------------
    // 타자 TTS
    // --------------------------------------------------------

    if (
      previousBatterName !==
      currentBatter.name
    ) {

      previousBatterName =
        currentBatter.name;

      const batterMsg =
        `${currentBatter.num}번 타자 ` +
        `${currentBatter.pos}는 ` +
        `${currentBatter.name}`;

      speakAnnouncement(
        batterMsg
      );
    }


    // --------------------------------------------------------
    // 투수 교체 TTS
    // --------------------------------------------------------

    if (
      previousPitcherName !==
      currentPitcher.name
    ) {

      if (
        previousPitcherName !== ""
      ) {

        const pitcherMsg =
          `${defenseTeam.shortName}의 ` +
          `선수교체입니다. ` +
          `투수 ${currentPitcher.name}`;

        speakAnnouncement(
          pitcherMsg
        );
      }

      previousPitcherName =
        currentPitcher.name;
    }


    // --------------------------------------------------------
    // 투수 기록
    // --------------------------------------------------------

    const currentPitcherStats =
      currentPitcher.stats || {
        total: 0,
        balls: 0,
        strikes: 0,
        so: 0
      };


    const pitchTotal =
      document.getElementById(
        "pitch-total"
      );

    const pitchBalls =
      document.getElementById(
        "pitch-balls"
      );

    const pitchStrikes =
      document.getElementById(
        "pitch-strikes"
      );

    const pitchSo =
      document.getElementById(
        "pitch-so"
      );


    if (pitchTotal) {
      pitchTotal.textContent =
        currentPitcherStats.total;
    }

    if (pitchBalls) {
      pitchBalls.textContent =
        currentPitcherStats.balls;
    }

    if (pitchStrikes) {
      pitchStrikes.textContent =
        currentPitcherStats.strikes;
    }

    if (pitchSo) {
      pitchSo.textContent =
        currentPitcherStats.so;
    }


    // --------------------------------------------------------
    // 미니 BSO
    // --------------------------------------------------------

    const miniPitchCount =
      document.getElementById(
        "mini-pitch-count"
      );

    const miniB =
      document.getElementById(
        "mini-b"
      );

    const miniS =
      document.getElementById(
        "mini-s"
      );

    const miniO =
      document.getElementById(
        "mini-o"
      );


    if (miniPitchCount) {
      miniPitchCount.textContent =
        `${currentPitcherStats.total}구`;
    }

    if (miniB) {
      miniB.textContent =
        data.bso?.balls ?? 0;
    }

    if (miniS) {
      miniS.textContent =
        data.bso?.strikes ?? 0;
    }

    if (miniO) {
      miniO.textContent =
        data.bso?.outs ?? 0;
    }
  }


  // ==========================================================
  // 심판진
  // ==========================================================

  const refereesEl =
    document.getElementById(
      "referees-list"
    );


  if (
    refereesEl &&
    data.referees
  ) {

    refereesEl.innerHTML = `
      <span>
        CH ${data.referees.ch || "-"}
      </span>

      <span>
        Ⅰ ${data.referees.b1 || "-"}
      </span>

      <span>
        Ⅱ ${data.referees.b2 || "-"}
      </span>

      <span>
        Ⅲ ${data.referees.b3 || "-"}
      </span>
    `;
  }


  // ==========================================================
  // 경기 시간
  // ==========================================================

  const gameTimeEl =
    document.getElementById(
      "game-time-val"
    );


  if (gameTimeEl) {

    gameTimeEl.textContent =
      calculateGameTime(
        data.startTime
      );
  }


  // ==========================================================
  // 이닝 스코어보드
  // ==========================================================

  const tbodyEl =
    document.getElementById(
      "scoreboard-tbody"
    );


  if (tbodyEl) {

    const awayScore =
      Array.isArray(data.score.away)
        ? data.score.away
        : [];

    const homeScore =
      Array.isArray(data.score.home)
        ? data.score.home
        : [];


    tbodyEl.innerHTML = `

      <tr>

        <td class="team-td">
          ${data.awayTeam.shortName || ""}
        </td>

        ${awayScore
          .map(
            (s, idx) => `
              <td class="${
                data.isTop &&
                (idx + 1 === data.currentInning)
                  ? "active-inning"
                  : ""
              }">
                ${s}
              </td>
            `
          )
          .join("")}

        <td class="stat-td">
          ${data.score.awayStats?.R ?? 0}
        </td>

        <td class="stat-td">
          ${data.score.awayStats?.H ?? 0}
        </td>

        <td class="stat-td">
          ${data.score.awayStats?.E ?? 0}
        </td>

        <td class="stat-td">
          ${data.score.awayStats?.B ?? 0}
        </td>

      </tr>


      <tr>

        <td class="team-td">
          ${data.homeTeam.shortName || ""}
        </td>

        ${homeScore
          .map(
            (s, idx) => `
              <td class="${
                !data.isTop &&
                (idx + 1 === data.currentInning)
                  ? "active-inning"
                  : ""
              }">
                ${s}
              </td>
            `
          )
          .join("")}

        <td class="stat-td">
          ${data.score.homeStats?.R ?? 0}
        </td>

        <td class="stat-td">
          ${data.score.homeStats?.H ?? 0}
        </td>

        <td class="stat-td">
          ${data.score.homeStats?.E ?? 0}
        </td>

        <td class="stat-td">
          ${data.score.homeStats?.B ?? 0}
        </td>

      </tr>
    `;
  }


  // ==========================================================
  // 주자
  // ==========================================================

  updateBase(
    "base-1",
    "runner-1-name",
    data.runners?.base1 ?? null
  );

  updateBase(
    "base-2",
    "runner-2-name",
    data.runners?.base2 ?? null
  );

  updateBase(
    "base-3",
    "runner-3-name",
    data.runners?.base3 ?? null
  );


  // ==========================================================
  // BSO
  // ==========================================================

  updateBSODots(
    "bso-balls",
    data.bso?.balls ?? 0
  );

  updateBSODots(
    "bso-strikes",
    data.bso?.strikes ?? 0
  );

  updateBSODots(
    "bso-outs",
    data.bso?.outs ?? 0
  );
}


// ============================================================
// 라인업 HTML
// ============================================================

function renderLineupHTML(
  teamData,
  isAway
) {

  const headerClass =
    isAway
      ? ""
      : "home-header";

  const lineupClass =
    isAway
      ? ""
      : "home-lineup";


  const lineup =
    Array.isArray(teamData.lineup)
      ? teamData.lineup
      : [];


  const items =
    lineup
      .map(item => {

        const displayPos =
          item.subType
            ? item.subType
            : item.pos;


        return `
          <li
            class="${
              item.active
                ? "active-batter"
                : ""
            } ${
              item.isPitcher
                ? "pitcher-row"
                : ""
            }"
          >

            <span class="num">
              ${item.num ?? ""}
            </span>

            <span class="name">
              ${item.name ?? ""}
            </span>

            <span class="pos">
              ${displayPos ?? ""}
            </span>

            <span class="avg">
              ${item.avg ?? ""}
            </span>

          </li>
        `;
      })
      .join("");


  return `
    <div class="team-header ${headerClass}">

      <span class="team-name">
        ${teamData.name ?? ""}
      </span>

      <span class="header-stat-title">
        AVG
      </span>

    </div>


    <ul class="lineup-list ${lineupClass}">
      ${items}
    </ul>
  `;
}


// ============================================================
// 수비진 HTML
// ============================================================

function renderDefenseHTML(
  teamData,
  isAway
) {

  const headerClass =
    isAway
      ? ""
      : "home-header";


  const headerColorClass =
    isAway
      ? "blue-header"
      : "red-header";


  const def =
    teamData.defense || {};


  const pitcher =
    teamData.pitcher || {
      num: "--",
      name: "투수 선택 필요",
      w: 0,
      l: 0,
      h: 0,
      sv: 0,
      era: "--.--",
      stats: {
        total: 0
      }
    };


  return `

    <div class="team-header ${headerClass}">

      <span class="team-name">
        ${teamData.name ?? ""}
      </span>

    </div>


    <div class="defense-section">

      <div class="sub-header">
        수비 라인업
      </div>

      <div class="field-container">

        <span class="f-pos p-cf">
          ${def.cf ?? ""}
        </span>

        <span class="f-pos p-lf">
          ${def.lf ?? ""}
        </span>

        <span class="f-pos p-rf">
          ${def.rf ?? ""}
        </span>

        <span class="f-pos p-ss">
          ${def.ss ?? ""}
        </span>

        <span class="f-pos p-2b">
          ${def["2b"] ?? ""}
        </span>

        <span class="f-pos p-3b">
          ${def["3b"] ?? ""}
        </span>

        <span class="f-pos p-1b">
          ${def["1b"] ?? ""}
        </span>

        <span class="f-pos p-p">
          ${def.p ?? ""}
        </span>

        <span class="f-pos p-c">
          ${def.c ?? ""}
        </span>

      </div>

    </div>


    <div class="pitcher-section">

      <div class="sub-header ${headerColorClass}">
        투수 정보
      </div>


      <div class="p-main-info">

        <span class="p-num">
          ${pitcher.num ?? "--"}
        </span>

        <span class="p-name">
          ${pitcher.name ?? "투수 선택 필요"}
        </span>

      </div>


      <div class="p-stats-row">

        <span>
          승
          <strong>
            ${pitcher.w ?? 0}
          </strong>
        </span>

        <span>
          패
          <strong>
            ${pitcher.l ?? 0}
          </strong>
        </span>

        <span>
          홀
          <strong>
            ${pitcher.h ?? 0}
          </strong>
        </span>

        <span>
          세
          <strong>
            ${pitcher.sv ?? 0}
          </strong>
        </span>

      </div>


      <div class="p-stats-row2">

        <span>
          투구수

          <strong>
            ${
              pitcher.stats?.total ?? 0
            }구
          </strong>

        </span>


        <span>
          평균자책점

          <strong>
            ${pitcher.era ?? "--.--"}
          </strong>

        </span>

      </div>

    </div>
  `;
}


// ============================================================
// 베이스 업데이트
// ============================================================

function updateBase(
  baseId,
  nameId,
  runnerName
) {

  const baseEl =
    document.getElementById(baseId);

  const nameEl =
    document.getElementById(nameId);


  if (!baseEl || !nameEl) {
    return;
  }


  if (runnerName) {

    baseEl.classList.add(
      "occupied"
    );

    nameEl.textContent =
      runnerName;

  } else {

    baseEl.classList.remove(
      "occupied"
    );

    nameEl.textContent = "";
  }
}


// ============================================================
// BSO 점 업데이트
// ============================================================

function updateBSODots(
  rowId,
  count
) {

  const rowEl =
    document.getElementById(rowId);

  if (!rowEl) return;


  const dots =
    rowEl.querySelectorAll(".dot");


  dots.forEach(
    (dot, index) => {

      if (index < count) {

        dot.classList.add(
          "active"
        );

      } else {

        dot.classList.remove(
          "active"
        );
      }
    }
  );
}


// ============================================================
// 초기화
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      `[Scoreboard] 초기화 완료 - 경기 코드: ${roomCode}`
    );

    listenGame();
  }
);