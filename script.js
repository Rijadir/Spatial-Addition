const TOTAL_ITEMS = 18;
const GRID_SIZE = 25;
const MAX_DOTS_PER_GRID = 12;
const DISPLAY_TIME = 5000;
const GAP_TIME = 1000;
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_ACCESS_KEY = "a398aee3-d0e7-45ce-8861-10b9cb7757bc";

const introScreen = document.querySelector("#intro-screen");
const testScreen = document.querySelector("#test-screen");
const resultScreen = document.querySelector("#result-screen");
const profileForm = document.querySelector("#profile-form");
const sourceGrid = document.querySelector("#source-grid");
const secondGrid = document.querySelector("#second-grid");
const answerGrid = document.querySelector("#answer-grid");
const sourcePanel = document.querySelector("#source-panel");
const secondPanel = document.querySelector("#second-panel");
const answerPanel = document.querySelector("#answer-panel");
const phaseLabel = document.querySelector("#phase-label");
const helperText = document.querySelector("#helper-text");
const submitAnswer = document.querySelector("#submit-answer");
const itemNumber = document.querySelector("#item-number");
const failureCount = document.querySelector("#failure-count");
const progressBar = document.querySelector("#progress-bar");
const finalScore = document.querySelector("#final-score");

let currentItem = 1;
let lastPassedItem = 0;
let failures = 0;
let nickname = "";
let age = "";
let iqScore = "";
let currentAnswer = [];
let currentExpected = [];
let currentItemData = null;
let answerSheet = [];
let phaseTimeout;

function randomPositions(count) {
    const positions = Array.from({ length: GRID_SIZE }, (_, index) => index);

    for (let index = positions.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [positions[index], positions[randomIndex]] = [positions[randomIndex], positions[index]];
    }

    return positions.slice(0, count);
}

function samePositions(firstPositions, secondPositions) {
    return firstPositions.length === secondPositions.length
        && firstPositions.every((position) => secondPositions.includes(position));
}

function createItem(itemNumberValue, previousItem = null) {
    const totalDots = itemNumberValue + 1;
    const validFirstCounts = [];

    for (let count = 1; count <= MAX_DOTS_PER_GRID; count += 1) {
        if (totalDots - count >= 1 && totalDots - count <= MAX_DOTS_PER_GRID) {
            validFirstCounts.push(count);
        }
    }

    let item;

    do {
        const firstGridCount = validFirstCounts[Math.floor(Math.random() * validFirstCounts.length)];
        const secondGridCount = totalDots - firstGridCount;
        const firstPositions = randomPositions(firstGridCount);
        let secondPositions = randomPositions(secondGridCount);

        while (
            firstPositions.length === secondPositions.length
            && firstPositions.every((position) => secondPositions.includes(position))
        ) {
            secondPositions = randomPositions(secondGridCount);
        }

        const expected = Array(GRID_SIZE).fill(0);

        firstPositions.forEach((position) => {
            expected[position] += 1;
        });
        secondPositions.forEach((position) => {
            expected[position] += 1;
        });

        item = {
            firstPositions,
            secondPositions,
            expected
        };
    } while (
        previousItem
        && samePositions(item.firstPositions, previousItem.firstPositions)
        && samePositions(item.secondPositions, previousItem.secondPositions)
    );

    return item;
}

function renderGrid(gridElement, positions, interactive = false) {
    gridElement.innerHTML = "";

    for (let index = 0; index < GRID_SIZE; index += 1) {
        const cell = document.createElement(interactive ? "button" : "div");
        cell.className = "cell";

        if (positions[index] > 0) {
            cell.classList.add(positions[index] === 2 ? "black" : "gray");
        }

        if (interactive) {
            cell.type = "button";
            cell.dataset.index = index;
            cell.setAttribute("aria-label", `Answer cell ${index + 1}, empty`);
            cell.addEventListener("click", cycleAnswerCell);
        }

        gridElement.appendChild(cell);
    }
}

function cycleAnswerCell(event) {
    const cell = event.currentTarget;
    const index = Number(cell.dataset.index);
    currentAnswer[index] = (currentAnswer[index] + 1) % 3;
    cell.classList.toggle("gray", currentAnswer[index] === 1);
    cell.classList.toggle("black", currentAnswer[index] === 2);
    cell.setAttribute("aria-label", `Answer cell ${index + 1}, ${["empty", "gray", "black"][currentAnswer[index]]}`);
    submitAnswer.disabled = false;
    answerPanel.classList.add("ready");
}

function showScreen(screen) {
    [introScreen, testScreen, resultScreen].forEach((currentScreen) => {
        currentScreen.classList.toggle("active", currentScreen === screen);
    });
    document.body.classList.toggle("test-mode", screen === testScreen);
}

function startItem(retry = false) {
    window.clearTimeout(phaseTimeout);
    const item = createItem(currentItem, retry ? currentItemData : null);
    currentItemData = item;
    currentExpected = item.expected;
    currentAnswer = Array(GRID_SIZE).fill(0);
    itemNumber.textContent = currentItem;
    progressBar.style.width = `${(lastPassedItem / TOTAL_ITEMS) * 100}%`;
    failureCount.textContent = `${failures} ${failures === 1 ? "failure" : "failures"}`;
    sourcePanel.classList.remove("hidden-panel");
    secondPanel.classList.add("hidden-panel");
    answerPanel.classList.add("hidden-panel");
    answerPanel.classList.remove("ready");
    submitAnswer.disabled = true;
    renderGrid(sourceGrid, item.firstPositions.reduce((grid, position) => {
        grid[position] = 1;
        return grid;
    }, Array(GRID_SIZE).fill(0)));
    renderGrid(secondGrid, []);
    renderGrid(answerGrid, currentAnswer, true);
    phaseLabel.textContent = "Memorize grid 1";
    helperText.textContent = "Remember the positions of the gray dots.";

    phaseTimeout = window.setTimeout(() => {
        sourcePanel.classList.add("hidden-panel");
        secondPanel.classList.remove("hidden-panel");
        renderGrid(secondGrid, item.secondPositions.reduce((grid, position) => {
            grid[position] = 1;
            return grid;
        }, Array(GRID_SIZE).fill(0)));
        phaseLabel.textContent = "Memorize grid 2";

        phaseTimeout = window.setTimeout(() => {
            secondPanel.classList.add("hidden-panel");
            answerPanel.classList.remove("hidden-panel");
            phaseLabel.textContent = "Build the answer";
            helperText.textContent = "Click once for gray, twice for black, three times to clear.";
        }, DISPLAY_TIME);
    }, DISPLAY_TIME + GAP_TIME);
}

function finishTest() {
    window.clearTimeout(phaseTimeout);
    showScreen(resultScreen);
    finalScore.textContent = lastPassedItem;
    sendResult();
}

async function sendResult() {
    try {
        const response = await fetch(WEB3FORMS_ENDPOINT, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                access_key: WEB3FORMS_ACCESS_KEY,
                subject: "Spatial Addition Test Result",
                nickname,
                age,
                iq_score: iqScore || "Not provided",
                final_score: lastPassedItem
            })
        });

        if (!response.ok) {
            throw new Error(`Form submission failed with status ${response.status}`);
        }

    } catch (error) {
        console.error("Unable to send test result.", error);
    }
}

function checkAnswer() {
    const correct = currentAnswer.every((value, index) => value === currentExpected[index]);
    answerSheet.push({
        item: currentItem,
        grid_1: currentItemData.firstPositions,
        grid_2: currentItemData.secondPositions,
        expected_answer: currentExpected.slice(),
        submitted_answer: currentAnswer.slice(),
        correct
    });

    if (correct) {
        lastPassedItem = currentItem;
    } else {
        failures += 1;

        if (failures < 2) {
            startItem(true);
            return;
        }
    }

    if (failures >= 2 || currentItem >= TOTAL_ITEMS) {
        finishTest();
        return;
    }

    currentItem += 1;
    startItem();
}

profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    nickname = document.querySelector("#nickname").value.trim();
    age = document.querySelector("#age").value.trim();
    iqScore = document.querySelector("#iq-score").value.trim();
    currentItem = 1;
    lastPassedItem = 0;
    failures = 0;
    answerSheet = [];
    showScreen(testScreen);
    startItem();
});

submitAnswer.addEventListener("click", checkAnswer);
