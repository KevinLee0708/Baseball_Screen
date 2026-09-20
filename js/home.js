import { createRoom, roomExists } from "./room.js";

document.addEventListener("DOMContentLoaded", () => {
  // HTML 요소 참조
  const createRoomBtn = document.getElementById("create-room-btn");
  const roomCreatedBox = document.getElementById("room-created");
  const roomCodeEl = document.getElementById("room-code");

  const joinRoomCodeInput = document.getElementById("join-room-code");
  const joinRoomBtn = document.getElementById("join-room-btn");

  const copyCodeBtn = document.getElementById("copy-code-btn");
  const goControllerBtn = document.getElementById("go-controller-btn");
  const goScoreboardBtn = document.getElementById("go-scoreboard-btn");


  // =========================================
  // 1. 새 경기 만들기
  // =========================================

  if (createRoomBtn) {
    createRoomBtn.addEventListener("click", async () => {
      try {
        setButtonLoading(createRoomBtn, true);

        // 방 생성
        const roomCode = await createRoom();

        if (!roomCode) {
          throw new Error("방 코드가 생성되지 않았습니다.");
        }

        // 생성된 코드 표시
        roomCodeEl.textContent = roomCode;
        roomCreatedBox.hidden = false;

        // Controller 이동
        if (goControllerBtn) {
          goControllerBtn.href =
            `controller/index.html?room=${roomCode}`;
        }

        // Scoreboard 이동
        if (goScoreboardBtn) {
          goScoreboardBtn.href =
            `scoreboard/index.html?room=${roomCode}`;
        }

      } catch (error) {
        console.error("방 생성 실패:", error);
        alert("방 생성 중 오류가 발생했습니다. 다시 시도해주세요.");

      } finally {
        setButtonLoading(createRoomBtn, false);
      }
    });
  }


  // =========================================
  // 2. 경기 코드 복사
  // =========================================

  if (copyCodeBtn) {
    copyCodeBtn.addEventListener("click", async () => {
      const codeText = roomCodeEl.textContent;

      if (!codeText || codeText === "------") {
        return;
      }

      try {
        await navigator.clipboard.writeText(codeText);
        alert("경기 코드가 클립보드에 복사되었습니다.");
      } catch (error) {
        console.error("코드 복사 실패:", error);
        alert("복사에 실패했습니다.");
      }
    });
  }


  // =========================================
  // 3. 경기 참가
  // =========================================

  if (joinRoomBtn) {
    joinRoomBtn.addEventListener("click", async () => {

      const roomCode = joinRoomCodeInput.value.trim();


      // 6자리 숫자인지 확인
      if (!/^\d{6}$/.test(roomCode)) {
        alert("올바른 6자리 숫자 코드를 입력해 주세요.");
        return;
      }


      try {
        // 버튼 잠금
        joinRoomBtn.disabled = true;

        const btnText = joinRoomBtn.querySelector(".btn-text");

        if (btnText) {
          btnText.textContent = "경기 확인 중...";
        }


        // Firestore에서 방 존재 여부 확인
        const exists = await roomExists(roomCode);


        // 존재하지 않는 경기
        if (!exists) {
          alert("존재하지 않는 경기입니다.");
          return;
        }


        // 존재하는 경기 → 스코어보드로 이동
        window.location.href =
          `scoreboard/index.html?room=${roomCode}`;

      } catch (error) {
        console.error("경기 참가 실패:", error);
        alert("경기 참가 중 오류가 발생했습니다.");

      } finally {
        joinRoomBtn.disabled = false;

        const btnText = joinRoomBtn.querySelector(".btn-text");

        if (btnText) {
          btnText.textContent = "경기 참가";
        }
      }
    });
  }


  // =========================================
  // 버튼 로딩 상태
  // =========================================

  function setButtonLoading(button, isLoading) {
    const btnText = button.querySelector(".btn-text");
    const spinner = button.querySelector(".spinner");

    button.disabled = isLoading;

    if (isLoading) {
      if (btnText) {
        btnText.textContent = "방 생성 중...";
      }

      if (spinner) {
        spinner.hidden = false;
      }

    } else {
      if (btnText) {
        btnText.textContent = "새 경기 만들기";
      }

      if (spinner) {
        spinner.hidden = true;
      }
    }
  }
});