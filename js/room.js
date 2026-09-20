// js/room.js

import { db } from "./firebase.js";

import {
    collection,
    doc,
    runTransaction,
    getDoc,
    deleteDoc
} from
    "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// 설정
// ============================================================

const ROOM_COLLECTION = "baseball";

const ROOM_MIN = 100000;
const ROOM_MAX = 999999;


// ============================================================
// Room Code 생성
// ============================================================

function generateRoomCode() {

    return String(
        Math.floor(
            Math.random() *
            (ROOM_MAX - ROOM_MIN + 1)
            + ROOM_MIN
        )
    );
}


// ============================================================
// Room Code 검사
// ============================================================

function isValidRoomCode(roomCode) {

    return /^\d{6}$/.test(
        String(roomCode)
    );
}


// ============================================================
// 방 생성
// ============================================================

export async function createRoom(gameState = {}) {

    for (let attempt = 0; attempt < 10; attempt++) {

        const roomCode = generateRoomCode();

        const roomRef = doc(
            db,
            ROOM_COLLECTION,
            roomCode
        );


        try {

            const result = await runTransaction(
                db,
                async transaction => {

                    const snapshot =
                        await transaction.get(roomRef);


                    // 이미 존재하는 방
                    if (snapshot.exists()) {
                        return false;
                    }


                    // 새로운 방 생성
                    transaction.set(
                        roomRef,
                        {
                            type: "room",

                            createdAt: Date.now(),

                            status: "waiting",

                            gameState: gameState
                        }
                    );


                    return true;
                }
            );


            // 실제 생성 성공
            if (result === true) {

                console.log(
                    `[Room] 생성 완료: ${roomCode}`
                );

                return roomCode;
            }

        } catch (error) {

            console.error(
                "[Room] 방 생성 실패:",
                error
            );

            throw error;
        }
    }


    throw new Error(
        "방 생성에 실패했습니다. 다시 시도해주세요."
    );
}


// ============================================================
// 방 존재 여부
// ============================================================

export async function roomExists(roomCode) {

    roomCode = String(roomCode).trim();


    if (!isValidRoomCode(roomCode)) {
        return false;
    }


    const roomRef = doc(
        db,
        ROOM_COLLECTION,
        roomCode
    );


    const snapshot = await getDoc(roomRef);


    return snapshot.exists();
}


// ============================================================
// 방 정보 가져오기
// ============================================================

export async function getRoom(roomCode) {

    roomCode = String(roomCode).trim();


    if (!isValidRoomCode(roomCode)) {

        throw new Error(
            "올바른 방 코드가 아닙니다."
        );
    }


    const roomRef = doc(
        db,
        ROOM_COLLECTION,
        roomCode
    );


    const snapshot = await getDoc(roomRef);


    if (!snapshot.exists()) {
        return null;
    }


    return snapshot.data();
}


// ============================================================
// 방 삭제
// ============================================================

export async function deleteRoom(roomCode) {

    roomCode = String(roomCode).trim();


    if (!isValidRoomCode(roomCode)) {

        throw new Error(
            "올바른 방 코드가 아닙니다."
        );
    }


    const roomRef = doc(
        db,
        ROOM_COLLECTION,
        roomCode
    );


    await deleteDoc(roomRef);


    console.log(
        `[Room] 삭제 완료: ${roomCode}`
    );
}