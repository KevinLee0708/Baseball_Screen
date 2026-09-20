import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ========================================
// 기본 설정
// ========================================

const ROOM_COLLECTION = "baseball";

const params = new URLSearchParams(
  window.location.search
);

const roomCode = params.get("room");

if (!roomCode || !/^\d{6}$/.test(roomCode)) {
  alert("올바른 경기 코드가 없습니다.");
  throw new Error("Invalid room code");
}

const roomRef = doc(
  db,
  ROOM_COLLECTION,
  roomCode
);


// ========================================
// 현재 경기 데이터
// ========================================

let scoreboardData = null;


// ========================================
// 기본 팀 데이터
// ========================================

function createDefaultTeam(
  name = "팀",
  shortName = "팀"
) {
  return {
    name,
    shortName,

    lineup: [],

    defense: {},

    pitcher: {
      num: "",
      name: "",
      w: 0,
      l: 0,
      h: 0,
      sv: 0,
      era: "",
      stats: {
        total: 0,
        balls: 0,
        strikes: 0,
        so: 0
      }
    }
  };
}


// ========================================
// 기본 경기 데이터
// ========================================

function createDefaultGameState() {
  return {
    startTime: "",

    referees: {
      ch: "",
      b1: "",
      b2: "",
      b3: ""
    },

    isTop: true,

    currentInning: 1,

    awayTeam: createDefaultTeam(
      "원정팀",
      "원정"
    ),

    homeTeam: createDefaultTeam(
      "홈팀",
      "홈"
    ),

    score: {
      away: [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ],

      awayStats: {
        R: 0,
        H: 0,
        E: 0,
        B: 0
      },

      home: [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ],

      homeStats: {
        R: 0,
        H: 0,
        E: 0,
        B: 0
      }
    },

    runners: {
      base1: null,
      base2: null,
      base3: null
    },

    bso: {
      balls: 0,
      strikes: 0,
      outs: 0
    }
  };
}


// ========================================
// 경기 데이터 정규화
//
// Firestore에 예전 형식의 데이터가 있거나
// 일부 필드가 없어도 기본 구조를 자동으로 채움
// ========================================

function normalizeGameState(rawData) {
  const base = createDefaultGameState();

  const data =
    rawData &&
    typeof rawData === "object"
      ? rawData
      : {};

  const awayRaw =
    data.awayTeam &&
    typeof data.awayTeam === "object"
      ? data.awayTeam
      : {};

  const homeRaw =
    data.homeTeam &&
    typeof data.homeTeam === "object"
      ? data.homeTeam
      : {};

  const awayPitcherRaw =
    awayRaw.pitcher &&
    typeof awayRaw.pitcher === "object"
      ? awayRaw.pitcher
      : {};

  const homePitcherRaw =
    homeRaw.pitcher &&
    typeof homeRaw.pitcher === "object"
      ? homeRaw.pitcher
      : {};

  const awayPitcherStatsRaw =
    awayPitcherRaw.stats &&
    typeof awayPitcherRaw.stats === "object"
      ? awayPitcherRaw.stats
      : {};

  const homePitcherStatsRaw =
    homePitcherRaw.stats &&
    typeof homePitcherRaw.stats === "object"
      ? homePitcherRaw.stats
      : {};

  const scoreRaw =
    data.score &&
    typeof data.score === "object"
      ? data.score
      : {};

  const awayStatsRaw =
    scoreRaw.awayStats &&
    typeof scoreRaw.awayStats === "object"
      ? scoreRaw.awayStats
      : {};

  const homeStatsRaw =
    scoreRaw.homeStats &&
    typeof scoreRaw.homeStats === "object"
      ? scoreRaw.homeStats
      : {};

  const runnersRaw =
    data.runners &&
    typeof data.runners === "object"
      ? data.runners
      : {};

  const bsoRaw =
    data.bso &&
    typeof data.bso === "object"
      ? data.bso
      : {};

  const refereesRaw =
    data.referees &&
    typeof data.referees === "object"
      ? data.referees
      : {};


  return {

    ...base,

    ...data,


    // ------------------------------------
    // 심판
    // ------------------------------------

    referees: {
      ...base.referees,
      ...refereesRaw
    },


    // ------------------------------------
    // 원정팀
    // ------------------------------------

    awayTeam: {

      ...base.awayTeam,

      ...awayRaw,

      lineup:
        Array.isArray(awayRaw.lineup)
          ? awayRaw.lineup
          : [],

      defense: {
        ...base.awayTeam.defense,
        ...(awayRaw.defense || {})
      },

      pitcher: {

        ...base.awayTeam.pitcher,

        ...awayPitcherRaw,

        stats: {

          ...base.awayTeam.pitcher.stats,

          ...awayPitcherStatsRaw

        }

      }

    },


    // ------------------------------------
    // 홈팀
    // ------------------------------------

    homeTeam: {

      ...base.homeTeam,

      ...homeRaw,

      lineup:
        Array.isArray(homeRaw.lineup)
          ? homeRaw.lineup
          : [],

      defense: {
        ...base.homeTeam.defense,
        ...(homeRaw.defense || {})
      },

      pitcher: {

        ...base.homeTeam.pitcher,

        ...homePitcherRaw,

        stats: {

          ...base.homeTeam.pitcher.stats,

          ...homePitcherStatsRaw

        }

      }

    },


    // ------------------------------------
    // 점수
    // ------------------------------------

    score: {

      ...base.score,

      ...scoreRaw,

      away:
        Array.isArray(scoreRaw.away)
          ? scoreRaw.away
          : [...base.score.away],

      home:
        Array.isArray(scoreRaw.home)
          ? scoreRaw.home
          : [...base.score.home],

      awayStats: {

        ...base.score.awayStats,

        ...awayStatsRaw

      },

      homeStats: {

        ...base.score.homeStats,

        ...homeStatsRaw

      }

    },


    // ------------------------------------
    // 주자
    // ------------------------------------

    runners: {

      ...base.runners,

      ...runnersRaw

    },


    // ------------------------------------
    // BSO
    // ------------------------------------

    bso: {

      ...base.bso,

      ...bsoRaw

    }

  };
}


// ========================================
// 경기 데이터 불러오기
// ========================================

async function loadGame() {

  try {

    const snapshot =
      await getDoc(roomRef);

    if (!snapshot.exists()) {

      alert(
        "존재하지 않는 경기입니다."
      );

      throw new Error(
        "Room does not exist"
      );

    }


    const data =
      snapshot.data();


    // ------------------------------------
    // gameState가 없는 경우
    // ------------------------------------

    if (!data.gameState) {

      console.warn(
        "[Controller] gameState가 없습니다. 기본 데이터를 생성합니다."
      );

      scoreboardData =
        createDefaultGameState();

      await updateDoc(
        roomRef,
        {
          gameState:
            scoreboardData
        }
      );

      console.log(
        "[Controller] 기본 gameState 생성 완료"
      );

    }


    // ------------------------------------
    // gameState가 존재하는 경우
    // ------------------------------------

    else {

      scoreboardData =
        normalizeGameState(
          data.gameState
        );


      // 정규화된 구조를 Firestore에도 반영
      await updateDoc(
        roomRef,
        {
          gameState:
            scoreboardData
        }
      );

    }


    console.log(
      "[Controller] 경기 데이터 불러옴:",
      scoreboardData
    );


    updateControllerUI(
      scoreboardData
    );

  }

  catch (error) {

    console.error(
      "[Controller] 경기 데이터 불러오기 실패:",
      error
    );

    throw error;

  }

}


// ========================================
// 실시간 경기 데이터 감시
// ========================================

function listenGame() {

  return onSnapshot(

    roomRef,

    snapshot => {

      if (!snapshot.exists()) {

        alert(
          "경기가 종료되었거나 삭제되었습니다."
        );

        return;

      }


      const data =
        snapshot.data();


      if (!data.gameState) {

        console.warn(
          "[Controller] Firestore에 gameState가 없습니다."
        );

        return;

      }


      // 중요:
      // Firestore에서 들어오는 데이터도
      // 항상 정규화한다.
      scoreboardData =
        normalizeGameState(
          data.gameState
        );


      console.log(
        "[Controller] Firestore 데이터 변경:",
        scoreboardData
      );


      updateControllerUI(
        scoreboardData
      );

    },

    error => {

      console.error(
        "[Controller] Firestore 실시간 연결 오류:",
        error
      );

      setConnectionStatus(false);

    }

  );

}


// ========================================
// Firestore 저장
// ========================================

async function saveGame() {

  if (!scoreboardData) {

    throw new Error(
      "경기 데이터가 없습니다."
    );

  }


  try {

    console.log(
      "[Controller] Firestore 저장 시작"
    );


    await updateDoc(

      roomRef,

      {
        gameState:
          scoreboardData
      }

    );


    console.log(
      "[Controller] Firestore 저장 완료"
    );


    setConnectionStatus(true);

  }

  catch (error) {

    console.error(
      "[Controller] Firestore 저장 실패:",
      error
    );

    setConnectionStatus(false);


    alert(
      "Firebase 저장에 실패했습니다.\n\n" +
      error.message
    );


    throw error;

  }

}


// ========================================
// 콘솔에서 직접 Firestore 업로드
// ========================================

window.uploadGameState =
  async function(gameState) {

    if (!gameState) {

      console.error(
        "업로드할 gameState가 없습니다."
      );

      return;

    }


    try {

      await updateDoc(

        roomRef,

        {
          gameState:
            gameState
        }

      );


      console.log(
        "✅ Firestore 업로드 완료"
      );

    }

    catch (error) {

      console.error(
        "❌ Firestore 업로드 실패:",
        error
      );

    }

  };


// ========================================
// 연결 상태 UI
// ========================================

function setConnectionStatus(
  connected
) {

  const statusEl =
    document.getElementById(
      "connection-status"
    );


  if (!statusEl) {
    return;
  }


  if (connected) {

    statusEl.textContent =
      "● LIVE";

    statusEl.classList.add(
      "live"
    );

  }

  else {

    statusEl.textContent =
      "● ERROR";

    statusEl.classList.remove(
      "live"
    );

  }

}


// ========================================
// 공격팀
// ========================================

function getOffenseTeam() {

  if (!scoreboardData) {
    return null;
  }


  return scoreboardData.isTop
    ? scoreboardData.awayTeam
    : scoreboardData.homeTeam;

}


// ========================================
// 수비팀
// ========================================

function getDefenseTeam() {

  if (!scoreboardData) {
    return null;
  }


  return scoreboardData.isTop
    ? scoreboardData.homeTeam
    : scoreboardData.awayTeam;

}


// ========================================
// 현재 타자
// ========================================

function getCurrentBatter() {

  const offenseTeam =
    getOffenseTeam();


  if (!offenseTeam) {
    return null;
  }


  if (
    !Array.isArray(
      offenseTeam.lineup
    )
  ) {

    return null;

  }


  return (

    offenseTeam.lineup.find(
      player => player.active
    )

    ||

    offenseTeam.lineup.find(
      player =>
        !player.isPitcher
    )

    ||

    null

  );

}


// ========================================
// 현재 타자 설정
// ========================================

function setCurrentBatter(
  number
) {

  const offenseTeam =
    getOffenseTeam();


  if (!offenseTeam) {
    return;
  }


  if (
    !Array.isArray(
      offenseTeam.lineup
    )
  ) {

    return;

  }


  offenseTeam.lineup.forEach(
    player => {

      player.active =
        Number(player.num) ===
        Number(number);

    }
  );

}


// ========================================
// 다음 타자
// ========================================

function moveToNextBatter() {

  const offenseTeam =
    getOffenseTeam();


  if (!offenseTeam) {
    return;
  }


  const lineup =
    offenseTeam.lineup;


  if (
    !Array.isArray(lineup) ||
    lineup.length === 0
  ) {

    return;

  }


  const currentIndex =
    lineup.findIndex(
      player =>
        player.active &&
        !player.isPitcher
    );


  // 현재 타자가 없으면
  // 첫 타자 선택
  if (currentIndex === -1) {

    const firstBatter =
      lineup.find(
        player =>
          !player.isPitcher
      );


    if (firstBatter) {

      lineup.forEach(
        player => {
          player.active = false;
        }
      );

      firstBatter.active =
        true;

    }

    return;

  }


  lineup[currentIndex].active =
    false;


  let nextIndex =
    currentIndex + 1;


  // 투수 제외
  while (
    nextIndex < lineup.length &&
    lineup[nextIndex].isPitcher
  ) {

    nextIndex++;

  }


  // 끝까지 갔으면 처음으로
  if (
    nextIndex >= lineup.length
  ) {

    nextIndex = 0;


    while (
      nextIndex < lineup.length &&
      lineup[nextIndex].isPitcher
    ) {

      nextIndex++;

    }

  }


  if (lineup[nextIndex]) {

    lineup[nextIndex].active =
      true;

  }

}


// ========================================
// BSO 초기화
// ========================================

function resetBSO() {

  if (!scoreboardData.bso) {

    scoreboardData.bso = {

      balls: 0,
      strikes: 0,
      outs: 0

    };

  }


  scoreboardData.bso.balls =
    0;

  scoreboardData.bso.strikes =
    0;

}


// ========================================
// 아웃 처리
// ========================================

function addOut() {

  if (!scoreboardData.bso) {

    scoreboardData.bso = {

      balls: 0,
      strikes: 0,
      outs: 0

    };

  }


  scoreboardData.bso.outs +=
    1;


  console.log(
    `[Controller] 아웃: ${scoreboardData.bso.outs}`
  );


  if (
    scoreboardData.bso.outs >= 3
  ) {

    changeInning();

    return true;

  }


  return false;

}


// ========================================
// 이닝 교체
// ========================================

function changeInning() {

  console.log(
    "[Controller] 이닝 교체"
  );


  resetBSO();

  scoreboardData.bso.outs =
    0;


  // ------------------------------------
  // 초 → 말
  // ------------------------------------

  if (scoreboardData.isTop) {

    scoreboardData.isTop =
      false;

  }


  // ------------------------------------
  // 말 → 다음 이닝 초
  // ------------------------------------

  else {

    scoreboardData.isTop =
      true;

    scoreboardData.currentInning +=
      1;

  }


  // ------------------------------------
  // 주자 초기화
  // ------------------------------------

  scoreboardData.runners = {

    base1: null,
    base2: null,
    base3: null

  };


  // ------------------------------------
  // 다음 공격팀 첫 타자
  // ------------------------------------

  const offenseTeam =
    getOffenseTeam();


  if (
    offenseTeam &&
    Array.isArray(
      offenseTeam.lineup
    )
  ) {

    offenseTeam.lineup.forEach(
      player => {

        player.active =
          false;

      }
    );


    const firstBatter =
      offenseTeam.lineup.find(
        player =>
          !player.isPitcher
      );


    if (firstBatter) {

      firstBatter.active =
        true;

    }

  }


  console.log(

    `[Controller] ${
      scoreboardData.currentInning
    }회 ${
      scoreboardData.isTop
        ? "초"
        : "말"
    }`

  );

}


// ========================================
// 투구 처리
// ========================================

async function pitch(result) {

  if (!scoreboardData) {

    console.error(
      "[Controller] 경기 데이터가 없습니다."
    );

    return;

  }


  const defenseTeam =
    getDefenseTeam();


  if (!defenseTeam) {
    return;
  }


  if (!defenseTeam.pitcher) {

    defenseTeam.pitcher =
      createDefaultTeam()
        .pitcher;

  }


  const pitcher =
    defenseTeam.pitcher;


  if (!pitcher.stats) {

    pitcher.stats = {

      total: 0,
      balls: 0,
      strikes: 0,
      so: 0

    };

  }


  // ------------------------------------
  // 모든 투구 +1
  // ------------------------------------

  pitcher.stats.total +=
    1;


  // ------------------------------------
  // BALL
  // ------------------------------------

  if (result === "ball") {

    scoreboardData.bso.balls +=
      1;

    pitcher.stats.balls +=
      1;


    // 4볼
    if (
      scoreboardData.bso.balls >= 4
    ) {

      console.log(
        "[Controller] 4볼 → 타자 교체"
      );


      resetBSO();

      moveToNextBatter();

    }

  }


  // ------------------------------------
  // STRIKE
  // ------------------------------------

  else if (result === "strike") {

    scoreboardData.bso.strikes +=
      1;

    pitcher.stats.strikes +=
      1;


    // 3스트라이크
    if (
      scoreboardData.bso.strikes >= 3
    ) {

      console.log(
        "[Controller] 3스트라이크 → 아웃"
      );


      pitcher.stats.so +=
        1;


      resetBSO();


      const inningChanged =
        addOut();


      if (!inningChanged) {

        moveToNextBatter();

      }

    }

  }


  // ------------------------------------
  // FOUL
  // ------------------------------------

  else if (result === "foul") {

    if (
      scoreboardData.bso.strikes < 2
    ) {

      scoreboardData.bso.strikes +=
        1;

    }


    pitcher.stats.strikes +=
      1;

  }


  // ------------------------------------
  // 잘못된 결과
  // ------------------------------------

  else {

    console.error(
      "[Controller] 알 수 없는 투구 결과:",
      result
    );

    return;

  }


  await saveGame();


  updateControllerUI(
    scoreboardData
  );

}


// ========================================
// 주자 수동 설정
// ========================================

async function setRunner(
  base,
  playerName
) {

  if (
    ![
      "base1",
      "base2",
      "base3"
    ].includes(base)
  ) {

    console.error(
      "[Controller] 잘못된 베이스:",
      base
    );

    return;

  }


  if (!scoreboardData.runners) {

    scoreboardData.runners = {

      base1: null,
      base2: null,
      base3: null

    };

  }


  scoreboardData.runners[base] =
    playerName || null;


  await saveGame();


  updateControllerUI(
    scoreboardData
  );

}


// ========================================
// 타격 기록 수동 입력
// ========================================

async function addTodayRecord(
  record
) {

  const batter =
    getCurrentBatter();


  if (!batter) {

    alert(
      "현재 타자가 없습니다."
    );

    return;

  }


  batter.todayRecord ??= [];


  batter.todayRecord.push(
    record
  );


  console.log(
    `[Controller] ${batter.name}: ${record}`
  );


  await saveGame();


  updateControllerUI(
    scoreboardData
  );

}


// ========================================
// 점수 변경
// ========================================

async function addRun(
  team,
  inning,
  runs = 1
) {

  if (
    !["away", "home"].includes(team)
  ) {

    console.error(
      "[Controller] 잘못된 팀:",
      team
    );

    return;

  }


  if (!scoreboardData.score) {
    return;
  }


  const inningIndex =
    Number(inning) - 1;


  if (inningIndex < 0) {
    return;
  }


  const scoreArray =
    scoreboardData.score[team];


  if (!Array.isArray(scoreArray)) {

    scoreboardData.score[team] =
      [];

  }


  while (
    scoreboardData.score[team].length <=
    inningIndex
  ) {

    scoreboardData.score[team].push(
      ""
    );

  }


  const currentScore =
    Number(
      scoreboardData.score[team][
        inningIndex
      ]
    ) || 0;


  scoreboardData.score[team][
    inningIndex
  ] = Math.max(

    0,

    currentScore +
      Number(runs)

  );


  const statsKey =
    `${team}Stats`;


  if (
    !scoreboardData.score[statsKey]
  ) {

    scoreboardData.score[statsKey] = {

      R: 0,
      H: 0,
      E: 0,
      B: 0

    };

  }


  scoreboardData.score[
    statsKey
  ].R =

    scoreboardData.score[team]
      .reduce(

        (sum, value) =>

          sum +
          (Number(value) || 0),

        0

      );


  await saveGame();


  updateControllerUI(
    scoreboardData
  );

}


// ========================================
// 팀 스탯 변경
// ========================================

async function addStat(
  team,
  stat,
  amount = 1
) {

  if (
    !["away", "home"].includes(team)
  ) {

    return;

  }


  const statsKey =
    `${team}Stats`;


  if (
    !scoreboardData.score[
      statsKey
    ]
  ) {

    scoreboardData.score[
      statsKey
    ] = {

      R: 0,
      H: 0,
      E: 0,
      B: 0

    };

  }


  const stats =
    scoreboardData.score[
      statsKey
    ];


  if (
    stats[stat] === undefined
  ) {

    console.error(
      `존재하지 않는 기록: ${stat}`
    );

    return;

  }


  stats[stat] +=
    Number(amount);


  stats[stat] =
    Math.max(
      0,
      stats[stat]
    );


  await saveGame();


  updateControllerUI(
    scoreboardData
  );

}


// ========================================
// 라인업 행 파싱
//
// 현재 HTML 구조:
//
// #away-lineup-rows
// #home-lineup-rows
//
// .lineup-row
// .p-name
// .p-num
// .p-pos
// ========================================

function parseLineupRows(
  containerId
) {

  const container =
    document.getElementById(
      containerId
    );


  if (!container) {

    console.error(
      `[Controller] 라인업 컨테이너를 찾을 수 없습니다: ${containerId}`
    );

    return {

      lineup: [],
      pitcher: null,
      defense: {}

    };

  }


  const rows =
    container.querySelectorAll(
      ".lineup-row"
    );


  const lineup = [];

  let pitcher = null;

  let batterOrder = 1;

  const defense = {};


  rows.forEach(
    (row, index) => {

      const nameInput =
        row.querySelector(
          ".p-name"
        );

      const numInput =
        row.querySelector(
          ".p-num"
        );

      const posInput =
        row.querySelector(
          ".p-pos"
        );


      const name =
        nameInput?.value.trim() ||
        "";

      const backNum =
        numInput?.value.trim() ||
        "";

      const pos =
        posInput?.value.trim() ||
        "";


      // --------------------------------
      // 아무것도 입력되지 않은 행
      // --------------------------------

      if (!name) {
        return;
      }


      const upperPos =
        pos.toUpperCase();


      // --------------------------------
      // 투수
      // --------------------------------

      const isPitcher =
        upperPos === "P" ||
        row.classList.contains(
          "pitcher-row"
        );


      if (isPitcher) {

        pitcher = {

          num: backNum,

          name,

          w: 0,
          l: 0,
          h: 0,
          sv: 0,
          era: "",

          stats: {

            total: 0,
            balls: 0,
            strikes: 0,
            so: 0

          }

        };


        // 라인업에도 투수 등록
        lineup.push({

          num: 0,

          backNum,

          name,

          pos: "P",

          avg: "",

          todayRecord: [],

          season: [],

          active: false,

          isPitcher: true

        });


        return;

      }


      // --------------------------------
      // 타자
      // --------------------------------

      const player = {

        num: batterOrder,

        backNum,

        name,

        pos,

        avg: "",

        todayRecord: [],

        season: [],

        active:
          batterOrder === 1,

        isPitcher: false

      };


      lineup.push(player);


      // --------------------------------
      // 수비 포지션
      // --------------------------------

      if (upperPos) {

        defense[upperPos] =
          name;

      }


      batterOrder +=
        1;

    }
  );


  return {

    lineup,

    pitcher,

    defense

  };

}


// ========================================
// 라인업 적용
// ========================================

async function applyLineup() {

  if (!scoreboardData) {

    alert(
      "경기 데이터를 아직 불러오지 못했습니다."
    );

    return;

  }


  // ------------------------------------
  // 혹시 모를 데이터 구조 누락 방지
  // ------------------------------------

  if (
    !scoreboardData.awayTeam ||
    typeof scoreboardData.awayTeam !==
      "object"
  ) {

    scoreboardData.awayTeam =
      createDefaultTeam(
        "원정팀",
        "원정"
      );

  }


  if (
    !scoreboardData.homeTeam ||
    typeof scoreboardData.homeTeam !==
      "object"
  ) {

    scoreboardData.homeTeam =
      createDefaultTeam(
        "홈팀",
        "홈"
      );

  }


  // ------------------------------------
  // 팀 이름
  // ------------------------------------

  const awayName =
    document
      .getElementById(
        "input-away-team-name"
      )
      ?.value.trim() ||
    "원정팀";


  const homeName =
    document
      .getElementById(
        "input-home-team-name"
      )
      ?.value.trim() ||
    "홈팀";


  // ------------------------------------
  // 현재 HTML의 행 기반 라인업 읽기
  // ------------------------------------

  const awayData =
    parseLineupRows(
      "away-lineup-rows"
    );


  const homeData =
    parseLineupRows(
      "home-lineup-rows"
    );


  // ------------------------------------
  // 타자가 하나라도 있는지 확인
  // ------------------------------------

  const awayHasBatter =
    awayData.lineup.some(
      player =>
        !player.isPitcher
    );


  const homeHasBatter =
    homeData.lineup.some(
      player =>
        !player.isPitcher
    );


  if (!awayHasBatter) {

    alert(
      "원정팀 타자 라인업을 1명 이상 입력해주세요."
    );

    return;

  }


  if (!homeHasBatter) {

    alert(
      "홈팀 타자 라인업을 1명 이상 입력해주세요."
    );

    return;

  }


  // ------------------------------------
  // 팀 정보 저장
  // ------------------------------------

  scoreboardData.awayTeam.name =
    awayName;

  scoreboardData.awayTeam.shortName =
    awayName;

  scoreboardData.awayTeam.lineup =
    awayData.lineup;

  scoreboardData.awayTeam.defense =
    awayData.defense;


  scoreboardData.homeTeam.name =
    homeName;

  scoreboardData.homeTeam.shortName =
    homeName;

  scoreboardData.homeTeam.lineup =
    homeData.lineup;

  scoreboardData.homeTeam.defense =
    homeData.defense;


  // ------------------------------------
  // 선발 투수
  // ------------------------------------

  if (awayData.pitcher) {

    scoreboardData.awayTeam.pitcher =
      awayData.pitcher;

  }


  if (homeData.pitcher) {

    scoreboardData.homeTeam.pitcher =
      homeData.pitcher;

  }


  // ------------------------------------
  // 현재 공격팀 첫 타자 활성화
  // ------------------------------------

  const offenseTeam =
    getOffenseTeam();


  if (
    offenseTeam &&
    Array.isArray(
      offenseTeam.lineup
    )
  ) {

    offenseTeam.lineup.forEach(
      player => {

        player.active =
          false;

      }
    );


    const firstBatter =
      offenseTeam.lineup.find(
        player =>
          !player.isPitcher
      );


    if (firstBatter) {

      firstBatter.active =
        true;

    }

  }


  // ------------------------------------
  // 저장
  // ------------------------------------

  await saveGame();


  updateControllerUI(
    scoreboardData
  );


  alert(
    "라인업 및 팀 정보가 Firebase에 저장되었습니다."
  );

}


// ========================================
// 현재 공격팀 라인업
// → 주자 선택 옵션
// ========================================

function updateRunnerSelectors() {

  const offenseTeam =
    getOffenseTeam();


  if (!offenseTeam) {
    return;
  }


  const lineup =
    Array.isArray(
      offenseTeam.lineup
    )
      ? offenseTeam.lineup
      : [];


  const bases = [
    "base1",
    "base2",
    "base3"
  ];


  bases.forEach(
    base => {

      const select =
        document.getElementById(
          `runner-${base}-select`
        );


      if (!select) {
        return;
      }


      const currentValue =
        scoreboardData.runners?.[
          base
        ] || "";


      select.innerHTML =
        `<option value="">(주자 없음)</option>`;


      lineup

        .filter(
          player =>
            !player.isPitcher
        )

        .forEach(
          player => {

            const option =
              document.createElement(
                "option"
              );


            option.value =
              player.name;


            option.textContent =
              `${player.num}. ${player.name}`;


            select.appendChild(
              option
            );

          }
        );


      select.value =
        currentValue;

    }
  );

}


// ========================================
// 교체 대상 선수 목록
// ========================================

function updateSubstitutionPlayers() {

  const teamSelect =
    document.getElementById(
      "sub-team-select"
    );


  const targetSelect =
    document.getElementById(
      "sub-target-player"
    );


  if (
    !teamSelect ||
    !targetSelect
  ) {

    return;

  }


  if (!scoreboardData) {
    return;
  }


  const team =
    scoreboardData[
      `${teamSelect.value}Team`
    ];


  if (!team) {
    return;
  }


  targetSelect.innerHTML =
    "";


  (
    team.lineup || []
  ).forEach(
    player => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        player.num;


      option.textContent =

        `${player.num}. ${player.name}` +

        (
          player.pos
            ? ` (${player.pos})`
            : ""
        );


      targetSelect.appendChild(
        option
      );

    }
  );

}


// ========================================
// 선수 교체
// ========================================

async function substitutePlayer() {

  const teamType =
    document.getElementById(
      "sub-team-select"
    )?.value;


  const targetNum =
    document.getElementById(
      "sub-target-player"
    )?.value;


  const subType =
    document.getElementById(
      "sub-type-select"
    )?.value;


  const newName =
    document.getElementById(
      "sub-new-player-name"
    )?.value.trim();


  const newBackNum =
    document.getElementById(
      "sub-new-player-backnum"
    )?.value.trim();


  const newPos =
    document.getElementById(
      "sub-new-player-pos"
    )?.value.trim();


  if (!newName) {

    alert(
      "교체할 선수 이름을 입력해주세요."
    );

    return;

  }


  const team =
    scoreboardData[
      `${teamType}Team`
    ];


  if (!team) {
    return;
  }


  if (!Array.isArray(team.lineup)) {

    team.lineup = [];

  }


  const targetIndex =
    team.lineup.findIndex(
      player =>
        String(player.num) ===
        String(targetNum)
    );


  if (targetIndex === -1) {

    alert(
      "교체 대상 선수를 찾을 수 없습니다."
    );

    return;

  }


  const targetPlayer =
    team.lineup[targetIndex];


  // ======================================
  // 대타
  // ======================================

  if (subType === "P") {

    const newPlayer = {

      num:
        targetPlayer.num,

      backNum:
        newBackNum,

      name:
        newName,

      pos:
        newPos ||
        targetPlayer.pos,

      avg: "",

      todayRecord: [],

      season: [],

      active:
        targetPlayer.active,

      isPitcher:
        false,

      subType: "P"

    };


    team.lineup[
      targetIndex
    ] = newPlayer;

  }


  // ======================================
  // 대주자
  // ======================================

  else if (subType === "R") {

    const newPlayer = {

      num:
        targetPlayer.num,

      backNum:
        newBackNum,

      name:
        newName,

      pos:
        newPos ||
        targetPlayer.pos,

      avg: "",

      todayRecord: [],

      season: [],

      active:
        targetPlayer.active,

      isPitcher:
        false,

      subType: "R"

    };


    team.lineup[
      targetIndex
    ] = newPlayer;

  }


  // ======================================
  // 수비 위치 변경 /
  // 투수 교체
  // ======================================

  else {

    const oldPosition =
      targetPlayer.pos;


    targetPlayer.name =
      newName;


    targetPlayer.backNum =
      newBackNum;


    if (newPos) {

      targetPlayer.pos =
        newPos;

    }


    // 투수 교체
    if (

      newPos?.toUpperCase() === "P" ||

      oldPosition?.toUpperCase() === "P"

    ) {

      if (!team.pitcher) {

        team.pitcher =
          createDefaultTeam()
            .pitcher;

      }


      team.pitcher = {

        ...team.pitcher,

        num:
          newBackNum ||
          team.pitcher.num ||
          "",

        name:
          newName,

        stats:
          team.pitcher.stats ||
          {

            total: 0,
            balls: 0,
            strikes: 0,
            so: 0

          }

      };


      targetPlayer.isPitcher =
        true;

    }

  }


  await saveGame();


  updateControllerUI(
    scoreboardData
  );


  closeSubstitutionModal();


  alert(
    "선수 교체가 적용되었습니다."
  );

}


// ========================================
// UI 업데이트
// ========================================

function updateControllerUI(
  data
) {

  if (!data) {
    return;
  }


  // --------------------------------------
  // 경기 코드
  // --------------------------------------

  const roomEl =
    document.getElementById(
      "display-room-code"
    );


  if (roomEl) {

    roomEl.textContent =
      roomCode;

  }


  // --------------------------------------
  // 이닝
  // --------------------------------------

  const inningNum =
    document.getElementById(
      "display-inning-num"
    );


  const inningHalf =
    document.getElementById(
      "display-inning-half"
    );


  if (inningNum) {

    inningNum.textContent =
      data.currentInning ?? 1;

  }


  if (inningHalf) {

    inningHalf.textContent =
      data.isTop
        ? "초"
        : "말";

  }


  // --------------------------------------
  // 팀 이름
  // --------------------------------------

  const awayName =
    document.getElementById(
      "away-team-name"
    );


  const homeName =
    document.getElementById(
      "home-team-name"
    );


  if (awayName) {

    awayName.textContent =
      data.awayTeam?.name ||
      "원정팀";

  }


  if (homeName) {

    homeName.textContent =
      data.homeTeam?.name ||
      "홈팀";

  }


  const awayTitle =
    document.getElementById(
      "adjust-away-title"
    );


  const homeTitle =
    document.getElementById(
      "adjust-home-title"
    );


  if (awayTitle) {

    awayTitle.textContent =
      data.awayTeam?.name ||
      "원정팀";

  }


  if (homeTitle) {

    homeTitle.textContent =
      data.homeTeam?.name ||
      "홈팀";

  }


  // --------------------------------------
  // 총점
  // --------------------------------------

  const awayTotal =
    document.getElementById(
      "away-total-score"
    );


  const homeTotal =
    document.getElementById(
      "home-total-score"
    );


  if (awayTotal) {

    awayTotal.textContent =
      data.score?.awayStats?.R ??
      0;

  }


  if (homeTotal) {

    homeTotal.textContent =
      data.score?.homeStats?.R ??
      0;

  }


  // --------------------------------------
  // BSO
  // --------------------------------------

  const ballsEl =
    document.getElementById(
      "bso-balls"
    );


  const strikesEl =
    document.getElementById(
      "bso-strikes"
    );


  const outsEl =
    document.getElementById(
      "bso-outs"
    );


  updateDots(
    ballsEl,
    data.bso?.balls ?? 0
  );


  updateDots(
    strikesEl,
    data.bso?.strikes ?? 0
  );


  updateDots(
    outsEl,
    data.bso?.outs ?? 0
  );


  // --------------------------------------
  // 현재 타자
  // --------------------------------------

  const batter =
    getCurrentBatter();


  const batterNum =
    document.getElementById(
      "current-batter-num"
    );


  const batterName =
    document.getElementById(
      "current-batter-name"
    );


  const batterPos =
    document.getElementById(
      "current-batter-pos"
    );


  const batterStats =
    document.getElementById(
      "current-batter-stats"
    );


  if (batter) {

    if (batterNum) {

      batterNum.textContent =
        `#${batter.backNum || batter.num}`;

    }


    if (batterName) {

      batterName.textContent =
        batter.name || "";

    }


    if (batterPos) {

      batterPos.textContent =
        batter.pos || "--";

    }


    if (batterStats) {

      batterStats.textContent =
        `타율 ${batter.avg || ".---"}`;

    }

  }


  else {

    if (batterNum) {

      batterNum.textContent =
        "--";

    }


    if (batterName) {

      batterName.textContent =
        "타자 없음";

    }


    if (batterPos) {

      batterPos.textContent =
        "--";

    }


    if (batterStats) {

      batterStats.textContent =
        "타율 .---";

    }

  }


  // --------------------------------------
  // 현재 투수
  // --------------------------------------

  const defenseTeam =
    getDefenseTeam();


  const pitcher =
    defenseTeam?.pitcher;


  const pitcherNum =
    document.getElementById(
      "current-pitcher-num"
    );


  const pitcherName =
    document.getElementById(
      "current-pitcher-name"
    );


  const pitcherStats =
    document.getElementById(
      "current-pitcher-stats"
    );


  if (pitcher) {

    if (pitcherNum) {

      pitcherNum.textContent =
        `#${pitcher.num || "--"}`;

    }


    if (pitcherName) {

      pitcherName.textContent =
        pitcher.name ||
        "투수 선택 필요";

    }


    if (pitcherStats) {

      const stats =
        pitcher.stats || {};


      pitcherStats.textContent =

        `${stats.total || 0}구 ` +

        `(B:${stats.balls || 0} ` +

        `S:${stats.strikes || 0}) ` +

        `ERA ${pitcher.era || "--.--"}`;

    }

  }


  else {

    if (pitcherNum) {

      pitcherNum.textContent =
        "--";

    }


    if (pitcherName) {

      pitcherName.textContent =
        "투수 선택 필요";

    }


    if (pitcherStats) {

      pitcherStats.textContent =
        "0구 (B:0 S:0) ERA --.--";

    }

  }


  // --------------------------------------
  // 주자
  // --------------------------------------

  updateRunnerDisplay(
    data.runners || {}
  );


  updateRunnerSelectors();


  updateSubstitutionPlayers();


  // --------------------------------------
  // 현재 이닝 점수
  // --------------------------------------

  const inningIndex =

    (
      Number(
        data.currentInning
      ) || 1
    ) - 1;


  const awayInningScore =
    data.score?.away?.[
      inningIndex
    ];


  const homeInningScore =
    data.score?.home?.[
      inningIndex
    ];


  const awayCurrent =
    document.getElementById(
      "away-current-inning-score"
    );


  const homeCurrent =
    document.getElementById(
      "home-current-inning-score"
    );


  if (awayCurrent) {

    awayCurrent.textContent =
      Number(
        awayInningScore
      ) || 0;

  }


  if (homeCurrent) {

    homeCurrent.textContent =
      Number(
        homeInningScore
      ) || 0;

  }

}


// ========================================
// BSO 점 표시
// ========================================

function updateDots(
  container,
  count
) {

  if (!container) {
    return;
  }


  const dots =
    container.querySelectorAll(
      ".dot"
    );


  dots.forEach(
    (dot, index) => {

      dot.classList.toggle(
        "active",
        index < Number(count)
      );

    }
  );

}


// ========================================
// 주자 화면 표시
// ========================================

function updateRunnerDisplay(
  runners
) {

  const base1 =
    document.getElementById(
      "runner-1-name"
    );


  const base2 =
    document.getElementById(
      "runner-2-name"
    );


  const base3 =
    document.getElementById(
      "runner-3-name"
    );


  if (base1) {

    base1.textContent =
      runners.base1 ||
      "empty";

  }


  if (base2) {

    base2.textContent =
      runners.base2 ||
      "empty";

  }


  if (base3) {

    base3.textContent =
      runners.base3 ||
      "empty";

  }

}


// ========================================
// 선수 교체 모달
// ========================================

function openSubstitutionModal() {

  const modal =
    document.getElementById(
      "sub-modal"
    );


  if (modal) {

    modal.style.display =
      "flex";

  }


  updateSubstitutionPlayers();

}


function closeSubstitutionModal() {

  const modal =
    document.getElementById(
      "sub-modal"
    );


  if (modal) {

    modal.style.display =
      "none";

  }

}


// ========================================
// 버튼 이벤트 연결
// ========================================

function bindEvents() {

  // --------------------------------------
  // 투구
  // --------------------------------------

  document
    .getElementById(
      "pitch-ball"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.pitch(
          "ball"
        )
    );


  document
    .getElementById(
      "pitch-strike"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.pitch(
          "strike"
        )
    );


  document
    .getElementById(
      "pitch-foul"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.pitch(
          "foul"
        )
    );


  // --------------------------------------
  // 다음 타자
  // --------------------------------------

  document
    .getElementById(
      "btn-next-batter-manual"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.nextBatter()
    );


  // --------------------------------------
  // 이닝 강제 교체
  // --------------------------------------

  document
    .getElementById(
      "btn-change-inning"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.changeInning()
    );


  // --------------------------------------
  // 타격 기록
  // --------------------------------------

  document
    .querySelectorAll(
      "[data-record]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const record =
              button.dataset.record;


            Controller.addTodayRecord(
              record
            );

          }
        );

      }
    );


  // --------------------------------------
  // 주자 적용
  // --------------------------------------

  document
    .getElementById(
      "btn-apply-runners"
    )
    ?.addEventListener(
      "click",
      async () => {

        const base1 =
          document.getElementById(
            "runner-base1-select"
          )?.value || null;


        const base2 =
          document.getElementById(
            "runner-base2-select"
          )?.value || null;


        const base3 =
          document.getElementById(
            "runner-base3-select"
          )?.value || null;


        await Controller.setRunner(
          "base1",
          base1
        );


        await Controller.setRunner(
          "base2",
          base2
        );


        await Controller.setRunner(
          "base3",
          base3
        );

      }
    );


  // --------------------------------------
  // 라인업 적용
  // --------------------------------------

  document
    .getElementById(
      "btn-apply-lineup"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.applyLineup()
    );


  // --------------------------------------
  // 원정팀 점수 +
  // --------------------------------------

  document
    .getElementById(
      "btn-away-run-plus"
    )
    ?.addEventListener(
      "click",
      () => {

        const inning =
          scoreboardData.currentInning;


        Controller.addRun(
          "away",
          inning,
          1
        );

      }
    );


  // --------------------------------------
  // 원정팀 점수 -
  // --------------------------------------

  document
    .getElementById(
      "btn-away-run-minus"
    )
    ?.addEventListener(
      "click",
      () => {

        const inning =
          scoreboardData.currentInning;


        Controller.addRun(
          "away",
          inning,
          -1
        );

      }
    );


  // --------------------------------------
  // 홈팀 점수 +
  // --------------------------------------

  document
    .getElementById(
      "btn-home-run-plus"
    )
    ?.addEventListener(
      "click",
      () => {

        const inning =
          scoreboardData.currentInning;


        Controller.addRun(
          "home",
          inning,
          1
        );

      }
    );


  // --------------------------------------
  // 홈팀 점수 -
  // --------------------------------------

  document
    .getElementById(
      "btn-home-run-minus"
    )
    ?.addEventListener(
      "click",
      () => {

        const inning =
          scoreboardData.currentInning;


        Controller.addRun(
          "home",
          inning,
          -1
        );

      }
    );


  // --------------------------------------
  // 원정팀 H
  // --------------------------------------

  document
    .getElementById(
      "btn-away-stat-h"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.addStat(
          "away",
          "H",
          1
        )
    );


  // --------------------------------------
  // 원정팀 E
  // --------------------------------------

  document
    .getElementById(
      "btn-away-stat-e"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.addStat(
          "away",
          "E",
          1
        )
    );


  // --------------------------------------
  // 원정팀 B
  // --------------------------------------

  document
    .getElementById(
      "btn-away-stat-b"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.addStat(
          "away",
          "B",
          1
        )
    );


  // --------------------------------------
  // 홈팀 H
  // --------------------------------------

  document
    .getElementById(
      "btn-home-stat-h"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.addStat(
          "home",
          "H",
          1
        )
    );


  // --------------------------------------
  // 홈팀 E
  // --------------------------------------

  document
    .getElementById(
      "btn-home-stat-e"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.addStat(
          "home",
          "E",
          1
        )
    );


  // --------------------------------------
  // 홈팀 B
  // --------------------------------------

  document
    .getElementById(
      "btn-home-stat-b"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.addStat(
          "home",
          "B",
          1
        )
    );


  // --------------------------------------
  // 선수 교체
  // --------------------------------------

  document
    .getElementById(
      "btn-open-pitcher-sub"
    )
    ?.addEventListener(
      "click",
      openSubstitutionModal
    );


  document
    .getElementById(
      "btn-open-batter-sub"
    )
    ?.addEventListener(
      "click",
      openSubstitutionModal
    );


  document
    .getElementById(
      "btn-close-modal"
    )
    ?.addEventListener(
      "click",
      closeSubstitutionModal
    );


  document
    .getElementById(
      "btn-cancel-sub"
    )
    ?.addEventListener(
      "click",
      closeSubstitutionModal
    );


  document
    .getElementById(
      "btn-confirm-sub"
    )
    ?.addEventListener(
      "click",
      () =>
        Controller.substitutePlayer()
    );


  document
    .getElementById(
      "sub-team-select"
    )
    ?.addEventListener(
      "change",
      updateSubstitutionPlayers
    );

}


// ========================================
// Controller API
// ========================================

window.Controller = {

  pitch,

  setRunner,

  addTodayRecord,

  addRun,

  addStat,

  applyLineup,

  substitutePlayer,

  setCurrentBatter,


  nextBatter:
    async () => {

      if (!scoreboardData) {
        return;
      }


      moveToNextBatter();


      resetBSO();


      await saveGame();


      updateControllerUI(
        scoreboardData
      );

    },


  changeInning:
    async () => {

      if (!scoreboardData) {
        return;
      }


      changeInning();


      await saveGame();


      updateControllerUI(
        scoreboardData
      );

    },


  getData:
    () =>
      scoreboardData

};


// ========================================
// 시작
// ========================================

document.addEventListener(

  "DOMContentLoaded",

  async () => {

    try {

      await loadGame();


      bindEvents();


      listenGame();


      setConnectionStatus(
        true
      );


      console.log(
        `[Controller] 초기화 완료 - 경기 코드: ${roomCode}`
      );


      console.log(
        "[Controller] 콘솔 업로드:",
        "uploadGameState({...})"
      );

    }

    catch (error) {

      console.error(
        "[Controller] 초기화 실패:",
        error
      );


      setConnectionStatus(
        false
      );


      alert(
        "경기 데이터를 불러오지 못했습니다."
      );

    }

  }

);