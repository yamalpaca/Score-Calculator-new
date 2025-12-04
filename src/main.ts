// & "$HOME\.deno\bin\deno.exe" --version
// $env:PATH += ";$HOME\.deno\bin"
// deno --version
// deno task dev

import { gameData, timingData } from "./gamedata.ts";
import btnimg from "./images/btnimg.png";
import gameimg from "./images/gameicons.png";
import inputimg from "./images/inputimg.png";
import meterimg from "./images/meterimg.png";
import starimg from "./images/starimg.png";
import "./style.css";

const customFont = new FontFace("SeuratPro", "/src/fonts/FOT-SeuratPro-B.otf");
document.fonts.add(customFont);

interface Criteria {
  id: number;
  name: string;
  weight: number;
  hits: number;
  minscore: number;
  maxscore: number;
  total: number;
  minresult: number;
  maxresult: number;
}

const critPal: string[] = [
  "#ABC8FF",
  "#AAFF9B",
  "#FF9D9D",
  "#F0BAFF",
  "#FFE002",
];

interface Button {
  type: number;
  pressed: boolean;
  active: boolean;
  minacc: number;
  maxacc: number;
  slider: number;
  debug: number;
}

const tileSize: number = 30;
const selectOffsetX: number = 90;
const loadDist = 1;

let currGame = 0;
const STORAGE_KEY = "game-state";
function loadState(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as number;
    return parsed;
  } catch {
    return 0;
  }
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currGame));
  } catch {
    // ignore
  }
}
currGame = loadState();

let gd = gameData[currGame];
let pressCounter: number;
let finalMinScore: number;
let finalMaxScore: number;
let sumScore: number;
let selectX: number;
let prevSelectX: number;
let selectY: number;
let prevY: number;
let sliderY: number;
let maxWidth: number;
let scrollX: number;
let dragStartX: number;
let dragStartScrollX: number;
let drawState: boolean;
let mouseFocus: number;
let starPos: number;
let starPressed: boolean;
let starActive: boolean;
let starState: number;
let debugMode: boolean;
let scrollBarX: number;
let scrollBarW: number;
let scrollBarDrag: number;

const critData: Criteria[] = [];
const btnData: Button[] = [];

const titleSubText = document.createElement("h1");
titleSubText.textContent = "Rhythm Heaven Megamix";
titleSubText.className = "title-sub";
document.body.append(titleSubText);

const titleText = document.createElement("h1");
titleText.textContent = "Score Calculator";
titleText.className = "title-main";
document.body.append(titleText);

const chartContainer = document.createElement("div");
chartContainer.className = "chart-container";
document.body.append(chartContainer);

const gameSelect = document.createElement("div");
gameSelect.className = "custom-select";
gameSelect.innerHTML = `
  <div class="selected"></div>
  <div class="options"></div>
`;
gameSelect.style.gap = "10px";
gameSelect.style.marginBottom = "10px";
chartContainer.append(gameSelect);

const chartCanvas = document.createElement("canvas");
chartContainer.append(chartCanvas);
chartCanvas.className = "chart-canvas";

const chartTextRow = document.createElement("div");
chartTextRow.className = "chart-text-row";
chartContainer.append(chartTextRow);

const pressText = document.createElement("p");
pressText.className = "press-text";
chartTextRow.append(pressText);

const meterWrapper = document.createElement("div");
meterWrapper.className = "meter-wrapper";
chartContainer.append(meterWrapper);

const meterContainer = document.createElement("div");
meterContainer.className = "meter-container";
meterWrapper.append(meterContainer);

const meterCanvas = document.createElement("canvas");
meterContainer.append(meterCanvas);
meterCanvas.className = "meter-canvas";
meterCanvas.width = 232;
meterCanvas.height = 48;

const scoreText = document.createElement("p");
scoreText.textContent = "";
scoreText.className = "score-text";
meterContainer.append(scoreText);

const fillBtn = document.createElement("button");
fillBtn.textContent = "Set to 100";
fillBtn.style.backgroundColor = "#da0000ff";

const clearBtn = document.createElement("button");
clearBtn.textContent = "Set to 0";
clearBtn.style.backgroundColor = "#00b3ffff";

const debugBtn = document.createElement("button");
debugBtn.textContent = "Debug: OFF";
debugBtn.style.backgroundColor = "#2A2A2A";

let dataTable = document.createElement("div");
chartContainer.append(dataTable);

if (dataTable && dataTable.parentNode) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  dataTable.parentNode.insertBefore(wrapper, dataTable);

  wrapper.appendChild(dataTable);

  const btnContainer = document.createElement("div");
  btnContainer.className = "table-buttons";

  debugBtn.classList.add("debug-right");

  btnContainer.appendChild(fillBtn);
  btnContainer.appendChild(clearBtn);
  btnContainer.appendChild(debugBtn);

  wrapper.appendChild(btnContainer);
}

const creditsText = document.createElement("h1");
creditsText.textContent = "yamalpaca - v.0.8.2";
creditsText.className = "credits";
document.body.append(creditsText);

const btnIcons = new Image();
btnIcons.src = btnimg;
const inputIcons = new Image();
inputIcons.src = inputimg;
const meter = new Image();
meter.src = meterimg;
const gameIcons = new Image();
gameIcons.src = gameimg;
const starIcons = new Image();
starIcons.src = starimg;

function loadGame(index: number) {
  gd = gameData[index];

  mouseFocus = 0;
  selectX = -1;
  prevSelectX = -1;
  selectY = -1;
  prevY = -1;
  sliderY = 0;
  mouseFocus = 0;
  scrollX = 0;
  finalMinScore = 100;
  finalMaxScore = 100;
  sumScore = 0;
  starPos = 0;
  starPressed = true;
  starActive = true;
  starState = 3;
  scrollBarX = selectOffsetX;
  scrollBarDrag = 0;

  debugMode = false;

  critData.splice(0, critData.length);
  btnData.length = 0;
  for (let i = 0; i < gd.inputs.length; i++) {
    btnData.push({
      type: 0,
      pressed: true,
      active: true,
      minacc: 100,
      maxacc: 100,
      slider: 3,
      debug: 100,
    });
  }
  debugBtn.textContent = "Debug: OFF";

  updatePage(true);
}
loadGame(currGame);

function updatePage(all: boolean) {
  if (all) {
    updateData();

    chartCanvas.width = (gd.inputs.length * tileSize) + selectOffsetX;

    if (chartCanvas.width > (30.5 * tileSize) + selectOffsetX) {
      chartCanvas.width = (30.5 * tileSize) + selectOffsetX;
    }

    if (chartCanvas.width > globalThis.innerWidth - 15) {
      chartCanvas.width = globalThis.innerWidth - 15;
    }
    chartCanvas.height = tileSize * (critData.length + 2) + 116;
    if (debugMode) chartCanvas.height = tileSize * (critData.length + 3) + 10;

    const cWidth = chartCanvas.width - selectOffsetX;

    maxWidth = Math.floor(cWidth / tileSize);

    scrollBarW = cWidth * (cWidth / (gd.inputs.length * tileSize));

    scrollX = Math.max(
      0,
      Math.min(
        scrollX,
        Math.max(
          0,
          gd.inputs.length * tileSize - (chartCanvas.width - selectOffsetX),
        ),
      ),
    );

    drawChart();
    updateText();
    drawMeterCanvas();
  }

  drawInterface();
  drawScrollBar();
  drawHeader();
}

function updateData() {
  critData.splice(0, critData.length);
  finalMinScore = 0;
  finalMaxScore = 0;
  sumScore = 0;
  pressCounter = 0;

  for (let i: number = 0; i < gd.critweight.length; i++) {
    critData.push({
      id: i == gd.critweight.length - 1 ? 4 : i,
      name: i == gd.critweight.length - 1 ? "Skill Star" : gd.critname[i],
      weight: gd.critweight[i],
      hits: 0,
      minscore: 0,
      maxscore: 0,
      total: 0,
      minresult: 0,
      maxresult: 0,
    });
  }

  let gameid = gd.image;
  starActive = true;

  for (let i: number = 0; i < gd.inputs.length; i++) {
    const input = gd.inputs[i];

    btnData[i].type = 0;
    const sep = gd.separators?.find((s) => s.index === i && s.img);
    if (sep) {
      gameid = sep.img as number;
    }

    if (timingData[gameid]?.type) {
      btnData[i].type = timingData[gameid]?.type as number;
    }

    if (i == 0) {
      btnData[i].active = true;
      if (input.button == 5 && !btnData[i].pressed) pressCounter++;
    } else {
      btnData[i].active = !(input.combo && input.combotype != 1 &&
        (!btnData[i - 1].pressed || !btnData[i - 1].active));
      if (btnData[i - 1].type == 1) {
        if (
          [0, 6].includes(btnData[i - 1].slider) && gd.inputs[i - 1].button == 4
        ) {
          btnData[i].active = false;
          if (btnData[i].pressed) pressCounter++;
        }
        if (
          debugMode && btnData[i - 1].debug <= 60 &&
          gd.inputs[i - 1].button == 4
        ) {
          btnData[i].active = false;
          if (btnData[i].pressed) pressCounter++;
        }
      }
      if (btnData[i - 1].type == 8) {
        if (
          [0, 6].includes(btnData[i - 1].slider) && gd.inputs[i].combo &&
          gd.inputs[i].combotype != 1
        ) {
          btnData[i].active = false;
        }
        if (
          debugMode && btnData[i - 1].debug <= 60 && gd.inputs[i].combo &&
          gd.inputs[i].combotype != 1
        ) {
          btnData[i].active = false;
        }
      }
    }

    if (btnData[i].pressed && btnData[i].active) {
      if (btnData[i].slider == 0) {
        if (btnData[i].type == 2) btnData[i].slider = 1;
        if (btnData[i].type == 3 && [6, 7].includes(gd.inputs[i].button)) {
          btnData[i].slider = 1;
        }
        if (btnData[i].type == 4 && [4, 6].includes(gd.inputs[i].button)) {
          btnData[i].slider = 1;
        }
        if (btnData[i].type == 5 && [5, 7].includes(gd.inputs[i].button)) {
          btnData[i].slider = 1;
        }
        if (btnData[i].type == 6 && [4, 6].includes(gd.inputs[i].button)) {
          btnData[i].slider = 1;
        }
      }
      if (btnData[i].slider == 6) {
        if (btnData[i].type == 2) {
          btnData[i].slider = 5;
        }
        if (btnData[i].type == 3 && [6, 7].includes(gd.inputs[i].button)) {
          btnData[i].slider = 5;
        }
        if (btnData[i].type == 4 && [4, 6].includes(gd.inputs[i].button)) {
          btnData[i].slider = 5;
        }
        if (btnData[i].type == 5 && [5, 7].includes(gd.inputs[i].button)) {
          btnData[i].slider = 5;
        }
        if (btnData[i].type == 6 && [4, 6].includes(gd.inputs[i].button)) {
          btnData[i].slider = 5;
        }
      }
    }
    if (input.criteria == critData.length - 1 && input.multi > 0) {
      starPos = i;
      if (
        !btnData[i].active || !btnData[i].pressed ||
        [0, 6].includes(btnData[i].slider)
      ) {
        starActive = false;
        starPressed = false;
        starState = 0;
      }
    }

    if (!input.square) {
      critData[input.criteria].total += input.multi;
    } else {
      if (input.combo) {
        if (input.combotype == 1 || btnData[i].active) {
          critData[input.criteria].total += input.multi;
        }
      } else {
        if (btnData[i].pressed) {
          critData[input.criteria].total += input.multi;
        }
      }
    }
    if (input.extracrit > -1) {
      critData[input.extracrit].total++;
    }

    if (
      [4, 6].includes(input.button) && btnData[i].pressed &&
      i < gd.inputs.length - 1
    ) {
      if ([5, 7].includes(gd.inputs[i + 1].button)) {
        if (btnData[i + 1].pressed == false) {
          pressCounter++;
        }
      } else {
        pressCounter++;
      }
    } else {
      if (btnData[i].pressed && btnData[i].active) pressCounter++;
    }

    if (btnData[i].pressed && btnData[i].active) {
      let minacc = btnData[i].debug;
      let maxacc = btnData[i].debug;

      if (!debugMode) {
        minacc = 100;
        maxacc = 100;
        if (btnData[i].type == 4 && [5, 7].includes(gd.inputs[i].button)) {
          btnData[i].slider = 3;
        } else if (
          btnData[i].type == 7 && [5, 7].includes(gd.inputs[i].button)
        ) {
          btnData[i].slider = 3;
        } else {
          if (btnData[i].slider == 0) {
            minacc = timingData[gameid].main[0];
            if (timingData[gameid]?.release) {
              if ([4, 6].includes(gd.inputs[i].button)) {
                minacc = timingData[gameid].hold?.[0] ?? minacc;
              }
              if ([5, 7].includes(gd.inputs[i].button)) {
                minacc = timingData[gameid].release?.[0] ?? minacc;
              }
            }
            maxacc = 60;
          }

          if (btnData[i].slider == 6) {
            minacc = timingData[gameid].main[1];
            maxacc = timingData[gameid].main[2];
            if (timingData[gameid]?.release) {
              if ([4, 6].includes(gd.inputs[i].button)) {
                minacc = timingData[gameid].hold?.[1] ?? minacc;
                maxacc = timingData[gameid].hold?.[2] ?? maxacc;
              }
              if ([5, 7].includes(gd.inputs[i].button)) {
                minacc = timingData[gameid].release?.[1] ?? minacc;
                maxacc = timingData[gameid].release?.[2] ?? maxacc;
              }
            }
          }

          if ([1, 5].includes(btnData[i].slider)) {
            minacc = 80;
            maxacc = 84;
          }
          if ([2, 4].includes(btnData[i].slider)) {
            minacc = 85;
            maxacc = 94;
          }
        }
      }

      critData[input.criteria].hits += input.multi;
      btnData[i].minacc = minacc;
      btnData[i].maxacc = maxacc;

      critData[input.criteria].minscore += btnData[i].minacc * input.multi;
      critData[input.criteria].maxscore += btnData[i].maxacc * input.multi;

      if (input.extracrit > -1) {
        critData[input.extracrit].hits++;
        critData[input.extracrit].minscore += btnData[i].minacc;
        critData[input.extracrit].maxscore += btnData[i].maxacc;
      }
    }
  }

  const starCrit = critData[critData.length - 1];
  const starReq = starCrit.total * 90;

  if (starActive && !debugMode) {
    starState = starPressed ? 2 : 1;
    if (starCrit.maxscore < starCrit.total * 90) {
      starActive = false;
      starPressed = false;
      starState = 0;
    } else {
      if (starCrit.minscore >= starCrit.total * 90) {
        starPressed = true;
        starState = 3;
      }
    }

    starCrit.minscore -= btnData[starPos].minacc * gd.inputs[starPos].multi;
    starCrit.maxscore -= btnData[starPos].maxacc * gd.inputs[starPos].multi;
    if (starPressed) {
      btnData[starPos].minacc = (starReq - starCrit.minscore) /
        gd.inputs[starPos].multi;
      if (btnData[starPos].minacc < 80) {
        btnData[starPos].minacc = 80;
      }
      btnData[starPos].maxacc = 100;
    }
    if (
      !starPressed &&
      starCrit.maxscore +
            (btnData[starPos].maxacc * gd.inputs[starPos].multi) >= starReq
    ) {
      btnData[starPos].maxacc =
        (starReq - starCrit.maxscore) / gd.inputs[starPos].multi - 1;
    }
    starCrit.minscore += btnData[starPos].minacc * gd.inputs[starPos].multi;
    starCrit.maxscore += btnData[starPos].maxacc * gd.inputs[starPos].multi;
  }

  critData.forEach((c: Criteria) => {
    c.minscore = Math.max(c.minscore, 0);
    c.maxscore = Math.max(c.maxscore, 0);
    if (c.total > 0) sumScore += c.weight;
  });

  critData.forEach((c: Criteria) => {
    if (c.total == 0) {
      c.minresult = 0;
      c.maxresult = 0;
    } else {
      c.minresult = badRounding(c.minscore / (c.total * 100)) *
        (c.weight / sumScore) * 100;
      c.maxresult = badRounding(c.maxscore / (c.total * 100)) *
        (c.weight / sumScore) * 100;
      finalMinScore += c.minresult;
      finalMaxScore += c.maxresult;
    }
  });
}

function drawHeader() {
  const ctx = chartCanvas.getContext("2d")!;
  if (!ctx) return;

  ctx.fillStyle = "#141414ff";
  ctx.fillRect(0, 0, selectOffsetX, chartCanvas.height);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(selectOffsetX - 1, 0);
  ctx.lineTo(selectOffsetX - 1, (critData.length + 3) * tileSize + 95);
  ctx.stroke();

  for (let i: number = 0; i < critData.length; i++) {
    ctx.fillStyle = critPal[critData[i].id];
    ctx.fillRect(
      0,
      tileSize * (i + 1),
      selectOffsetX,
      tileSize,
    );

    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, (i + 2) * tileSize - 1);
    ctx.lineTo(
      selectOffsetX - 1,
      (i + 2) * tileSize - 1,
    );
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.letterSpacing = "1px";
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillText(
      critData[i].hits.toString() + "/" + critData[i].total.toString(),
      selectOffsetX - 32,
      (i + 2) * tileSize - 10,
    );

    drawIcon(
      selectOffsetX - tileSize - 1,
      (i + 1) * tileSize,
      0,
      critData[i].id,
      inputIcons,
      chartCanvas,
    );
  }

  ctx.font = "16px SeuratPro";
  ctx.letterSpacing = "1px";
  ctx.fillStyle = "white";
  ctx.fillText(
    "Inputs",
    selectOffsetX - 7,
    21,
  );
  ctx.fillText(
    "Buttons",
    selectOffsetX - 7,
    (critData.length + 2) * tileSize - 9,
  );

  if (!debugMode) {
    ctx.font = "12px Arial";
    ctx.filter = "brightness(50%)";
    ctx.fillText(
      "Early",
      selectOffsetX - 7,
      (critData.length + 3) * tileSize - 18,
    );
    ctx.fillText(
      "Perfect",
      selectOffsetX - 7,
      (critData.length + 3) * tileSize + 12,
    );
    ctx.fillText(
      "Late",
      selectOffsetX - 7,
      (critData.length + 3) * tileSize + 42,
    );
  }

  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(selectOffsetX - 1, tileSize);
  ctx.lineTo(selectOffsetX - 1, (critData.length + 1) * tileSize);
  ctx.stroke();
}

function drawChart() {
  const ctx = chartCanvas.getContext("2d")!;
  if (!ctx) return;

  ctx.fillStyle = "#141414ff";
  ctx.fillRect(
    selectOffsetX,
    0,
    gd.inputs.length * tileSize,
    tileSize,
  );

  for (let i: number = 0; i < critData.length; i++) {
    ctx.fillStyle = critPal[critData[i].id];
    ctx.fillRect(
      selectOffsetX,
      tileSize * (i + 1),
      gd.inputs.length * tileSize,
      tileSize,
    );

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(selectOffsetX, (i + 2) * tileSize - 1);
    ctx.lineTo(
      gd.inputs.length * tileSize + selectOffsetX,
      (i + 2) * tileSize - 1,
    );
    ctx.stroke();
  }

  ctx.fillStyle = "white";
  ctx.letterSpacing = "1px";
  ctx.textAlign = "center";
  ctx.font = "12px Arial";

  //const sepimg = gd.separators?.find((s) => s.img);

  for (let i: number = -loadDist; i < maxWidth + loadDist + 1; i++) {
    const ioffset = i + Math.floor(scrollX / tileSize);
    const input = gd.inputs[ioffset];

    if (!input) continue;

    /*
    if (!sepimg) {
      if ((ioffset % 5) == 4) {
        ctx.filter = "brightness(50%)";
        ctx.textAlign = "center";
        ctx.fillText(
          (ioffset + 1).toString(),
          (ioffset * tileSize) + selectOffsetX - scrollX + 15,
          15,
        );
      }
    }
    */

    const sep = gd.separators?.find((s) => s.index === ioffset);
    if (sep) {
      const drawX = (ioffset * tileSize) + selectOffsetX - scrollX;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "white";
      ctx.filter = "";

      if (sep.index > 0) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 0.5;
        ctx.moveTo(drawX, 2);
        ctx.lineTo(drawX, tileSize);
        ctx.stroke();

        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.moveTo(drawX, tileSize + 2);
        ctx.lineTo(drawX, (critData.length + 1) * tileSize);
        ctx.stroke();
      }

      if (sep.msg) {
        ctx.filter = "brightness(75%)";
        ctx.textAlign = "left";
        ctx.fillText(
          sep.msg,
          (ioffset * tileSize) + selectOffsetX - scrollX + 4,
          12,
        );
      }
      if (sep.img) {
        ctx.drawImage(
          gameIcons,
          sep.img * 44,
          0,
          44,
          46,
          (ioffset * tileSize) + selectOffsetX - scrollX + 4,
          2,
          22,
          23,
        );
      }
    }
    ctx.setLineDash([]);

    if (input.combo && input.combotype != 2) {
      ctx.lineWidth = 8;
      ctx.strokeStyle = "black";
      ctx.setLineDash([]);

      if (!btnData[ioffset].pressed || !btnData[ioffset].active) {
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 5]);
      }

      if (
        [0, 6].includes(btnData[ioffset].slider) && input.button == 4 &&
        btnData[ioffset].type == 1
      ) {
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 5]);
      }

      if (
        debugMode && btnData[ioffset].debug <= 60 &&
        btnData[ioffset].type == 8 &&
        input.square
      ) {
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 5]);
      }

      if (
        debugMode && btnData[ioffset].debug <= 60 && input.button == 4 &&
        btnData[ioffset].type == 1
      ) {
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 5]);
      }

      if (
        [0, 6].includes(btnData[ioffset].slider) &&
        btnData[ioffset].type == 8 &&
        input.square
      ) {
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 5]);
      }

      ctx.beginPath();
      ctx.moveTo(
        ((i + 0.5) * tileSize) + selectOffsetX - (scrollX % 30),
        (input.criteria + 1.5) * tileSize - 1,
      );
      ctx.lineTo(
        ((i + 1.5) * tileSize) + selectOffsetX - (scrollX % 30),
        (gd.inputs[ioffset + 1].criteria + 1.5) * tileSize - 1,
      );
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.filter = "brightness(100%)";

    const iindex = input.criteria == critData.length - 1 ? 4 : input.criteria;
    let itype = (btnData[ioffset].pressed && btnData[ioffset].active) ? 1 : 2;

    if (input.square) {
      itype += 2;

      if (
        input.combo && !btnData[ioffset].pressed && btnData[ioffset].active
      ) {
        itype = 2;
      }
    }

    if (input.multi > 0) {
      drawIcon(
        (i * tileSize) + selectOffsetX - (scrollX % 30),
        (input.criteria + 1) * tileSize,
        itype,
        iindex,
        inputIcons,
        chartCanvas,
      );
      if (input.extracrit > -1) {
        drawIcon(
          (i * tileSize) + selectOffsetX - (scrollX % 30),
          (input.extracrit + 1) * tileSize,
          itype,
          input.extracrit,
          inputIcons,
          chartCanvas,
        );
      }
    }

    if (input.multi > 1) {
      ctx.fillStyle = "black";
      if (input.multi > 9) {
        ctx.fillRect(
          (i * tileSize) + selectOffsetX - (scrollX % 30) + 11,
          (input.criteria + 1) * tileSize + 15,
          18,
          13,
        );
      } else {
        ctx.fillRect(
          (i * tileSize) + selectOffsetX - (scrollX % 30) + 18,
          (input.criteria + 1) * tileSize + 15,
          11,
          13,
        );
      }

      ctx.textAlign = "right";
      ctx.fillStyle = "white";
      ctx.fillText(
        input.multi.toString(),
        (i * tileSize) + selectOffsetX - (scrollX % 30) + 28,
        (input.criteria + 1) * tileSize + 26,
      );
    }
  }

  ctx.filter = "none";
}

function drawInterface() {
  const ctx = chartCanvas.getContext("2d")!;
  if (!ctx) return;
  ctx.filter = "none";

  ctx.fillStyle = "#141414ff";
  ctx.fillRect(
    selectOffsetX,
    tileSize * (critData.length + 1),
    gd.inputs.length * tileSize,
    tileSize * 2 + 110,
  );

  if (!debugMode) {
    for (let i: number = -loadDist; i < maxWidth + loadDist + 1; i++) {
      const ioffset = i + Math.floor(scrollX / tileSize);
      if (!gd.inputs[ioffset]) continue;
      if (gd.inputs[ioffset].multi == 0) continue;

      let sliderOffset = 0;

      if (btnData[ioffset].type == 2) sliderOffset = 10;
      if (
        btnData[ioffset].type == 3 && [6, 7].includes(gd.inputs[ioffset].button)
      ) {
        sliderOffset = 10;
      }
      if (
        btnData[ioffset].type == 4 && [4, 6].includes(gd.inputs[ioffset].button)
      ) {
        sliderOffset = 10;
      }
      if (
        btnData[ioffset].type == 4 && [5, 7].includes(gd.inputs[ioffset].button)
      ) {
        continue;
      }
      if (
        btnData[ioffset].type == 5 && [5, 7].includes(gd.inputs[ioffset].button)
      ) {
        sliderOffset = 10;
      }
      if (
        btnData[ioffset].type == 6 && [4, 6].includes(gd.inputs[ioffset].button)
      ) {
        sliderOffset = 10;
      }
      if (
        btnData[ioffset].type == 7 && [5, 7].includes(gd.inputs[ioffset].button)
      ) {
        continue;
      }

      if (btnData[ioffset].pressed && btnData[ioffset].active) {
        if ([0, 6].includes(btnData[ioffset].slider)) ctx.fillStyle = "#560900";
        if ([1, 5].includes(btnData[ioffset].slider)) ctx.fillStyle = "#6A2200";
        if ([2, 4].includes(btnData[ioffset].slider)) ctx.fillStyle = "#5A4100";
        if (btnData[ioffset].slider == 3) ctx.fillStyle = "#611B3A";
        ctx.fillRect(
          (i * tileSize) + selectOffsetX + 10 - (scrollX % 30),
          (critData.length + 2) * tileSize + 5 + sliderOffset,
          10,
          66 - (sliderOffset * 2),
        );
      } else {
        ctx.fillStyle = "#2c2c2cff";
        ctx.fillRect(
          (i * tileSize) + selectOffsetX + 13 - (scrollX % 30),
          (critData.length + 2) * tileSize + 5 + sliderOffset,
          4,
          66 - (sliderOffset * 2),
        );
      }
    }
  }

  for (let i: number = -loadDist; i < maxWidth + loadDist + 1; i++) {
    const ioffset = i + Math.floor(scrollX / tileSize);
    const input = gd.inputs[ioffset];

    if (!input) continue;
    if (input.button < 4) continue;

    const hold = [4, 6].includes(input.button);
    if (btnData[ioffset + (hold ? 1 : 0)] !== undefined) {
      if (btnData[ioffset + (hold ? 1 : 0)].active == false) continue;
    }

    ctx.fillStyle = input.button > 5 ? "#7F5E00" : "#8D1A1A";

    if (btnData[ioffset + (hold ? 1 : -1)] !== undefined) {
      if (btnData[ioffset + (hold ? 1 : -1)].active == false) continue;
    }

    if (btnData[ioffset].pressed) {
      const adjInput = gd.inputs[ioffset + (hold ? 1 : -1)];
      if (adjInput) {
        if (
          (hold ? [5, 7] : [4, 6]).includes(adjInput.button) &&
          btnData[ioffset + (hold ? 1 : -1)].pressed == false
        ) {
          ctx.fillStyle = input.button > 5 ? "#5E5E5E" : "#333333";
        }
      }
    } else {
      ctx.fillStyle = input.button > 5 ? "#5E5E5E" : "#333333";
    }

    ctx.fillRect(
      (i * tileSize) + selectOffsetX - (scrollX % 30) + (hold ? 15 : 0),
      (critData.length + 1) * tileSize + 1,
      15,
      28,
    );
  }

  if (selectX > -1 && selectX < gd.inputs.length) {
    ctx.fillStyle = "#ffffff30";
    ctx.fillRect(
      ((selectX - Math.floor(scrollX / tileSize)) * tileSize) + selectOffsetX -
        (scrollX % 30),
      tileSize * (critData.length + 1),
      tileSize,
      tileSize * 2 + 95,
    );
  }

  for (let i: number = -loadDist; i < maxWidth + loadDist + 1; i++) {
    const ioffset = i + Math.floor(scrollX / tileSize);
    const input = gd.inputs[ioffset];

    if (!input) continue;

    ctx.filter = "brightness(100%)";

    if (ioffset == starPos && !debugMode) {
      if ([1, 2].includes(starState) && selectX == starPos && sliderY > 6) {
        ctx.filter = "brightness(150%)";
        if (mouseFocus != 0) ctx.filter = "brightness(75%)";
      }
      drawIcon(
        (i * tileSize) + selectOffsetX - (scrollX % 30),
        (critData.length + 4) * tileSize + 14,
        starState,
        0,
        starIcons,
        chartCanvas,
      );
    }

    ctx.filter = "brightness(100%)";

    if (!btnData[ioffset].active) {
      drawIcon(
        (i * tileSize) + selectOffsetX - (scrollX % 30),
        (critData.length + 1) * tileSize,
        0,
        0,
        btnIcons,
        chartCanvas,
      );
      continue;
    }

    if (selectX == ioffset && selectY == 0) {
      ctx.filter = "brightness(150%)";
      if (mouseFocus != 0) ctx.filter = "brightness(75%)";
    }

    if (!btnData[ioffset].pressed) ctx.filter += "grayscale(100%)";

    drawIcon(
      (i * tileSize) + selectOffsetX - (scrollX % 30),
      (critData.length + 1) * tileSize,
      input.button,
      0,
      btnIcons,
      chartCanvas,
    );

    if (debugMode) {
      if (btnData[ioffset].pressed && btnData[ioffset].active) {
        ctx.fillStyle = "white";
        ctx.filter = "none";
        ctx.letterSpacing = "1px";
        ctx.textAlign = "center";
        ctx.font = "bold 14px Arial";
        ctx.fillText(
          btnData[ioffset].debug.toString(),
          (i * tileSize) + selectOffsetX + 15 - (scrollX % 30),
          (critData.length + 3) * tileSize - 11,
        );
      }
    } else {
      if (input.multi > 0 && btnData[ioffset].pressed) {
        if ([0, 6].includes(btnData[ioffset].slider)) ctx.fillStyle = "#D12727";
        if ([1, 5].includes(btnData[ioffset].slider)) {
          ctx.fillStyle = "#ff732dff";
        }
        if ([2, 4].includes(btnData[ioffset].slider)) ctx.fillStyle = "#FBB400";
        if (btnData[ioffset].slider == 3) ctx.fillStyle = "#FF4699";

        ctx.filter = "none";
        if (
          btnData[ioffset].slider == sliderY && selectX == ioffset &&
          selectY > 0
        ) {
          ctx.filter = "brightness(150%)";
          if (mouseFocus != 0) ctx.filter = "brightness(75%)";
        }

        ctx.fillRect(
          (i * tileSize) + selectOffsetX + 5 - (scrollX % 30),
          (critData.length + 2) * tileSize + 5 + (btnData[ioffset].slider * 10),
          20,
          6,
        );

        ctx.filter = "none";
        ctx.letterSpacing = "1px";
        ctx.textAlign = "center";
        ctx.font = "bold 14px Arial";

        if (ioffset != starPos) {
          let sliderText = "";
          if (btnData[ioffset].slider > 2) sliderText = "+";
          sliderText += (btnData[ioffset].slider - 3).toString();
          ctx.fillText(
            sliderText,
            (i * tileSize) + selectOffsetX + 15 - (scrollX % 30),
            (critData.length + 5) * tileSize + 5,
          );
        }
      }
    }
  }

  ctx.filter = "none";
}

function drawScrollBar() {
  const ctx = chartCanvas.getContext("2d")!;
  if (!ctx) return;

  ctx.fillStyle = "#141414ff";
  ctx.fillRect(
    0,
    chartCanvas.height - 10,
    chartCanvas.width,
    10,
  );

  ctx.fillStyle = "#4F4F4F";

  ctx.fillRect(0, chartCanvas.height - 10, chartCanvas.width, 1);

  if (scrollBarW < chartCanvas.width - selectOffsetX) {
    ctx.fillRect(
      scrollBarX,
      chartCanvas.height - 10,
      scrollBarW,
      10,
    );
  }
}

function drawMeterCanvas() {
  const ctx = meterCanvas.getContext("2d")!;
  if (!ctx || !scoreText) return;

  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(9, 9, 214, 30);

  scoreText.style.color = "#00B4FF";

  const minscore = Math.floor(finalMinScore);

  if (Math.floor(finalMaxScore) != minscore) {
    ctx.fillStyle = "#ffffff80";
    ctx.fillRect(9, 9, 214 * (Math.floor(finalMaxScore) / 100), 30);
  }

  if (minscore > 60) {
    if (minscore > 80) {
      ctx.fillStyle = "#FF0000";
      ctx.fillRect(9, 9, 214 * (minscore / 100), 30);
      ctx.fillStyle = "#00BE00";
      ctx.fillRect(9, 9, 214 * 0.8, 30);
    } else {
      ctx.fillStyle = "#00BE00";
      ctx.fillRect(9, 9, 214 * (minscore / 100), 30);
    }

    ctx.fillStyle = "#00B4FF";
    ctx.fillRect(9, 9, 214 * 0.6, 30);
  } else {
    ctx.fillStyle = "#00B4FF";
    ctx.fillRect(9, 9, 214 * (minscore / 100), 30);
  }

  if (minscore >= 80) {
    scoreText.style.color = "#FF0000";
  } else if (minscore >= 60) {
    scoreText.style.color = "#00BE00";
  }

  if (meter.complete) {
    ctx.drawImage(meter, 0, 0, 232, 48);
  } else {
    meter.onload = () => {
      ctx.drawImage(meter, 0, 0, 232, 48);
    };
  }
}

function updateText() {
  if (!scoreText) return;
  if (!pressText) return;

  let scoretxt = Math.floor(finalMinScore).toString();
  if (Math.floor(finalMinScore) != Math.floor(finalMaxScore)) {
    scoretxt += " - " + Math.floor(finalMaxScore).toString();
  }

  scoreText.textContent = scoretxt;
  pressText.textContent = "Presses: " + pressCounter.toString();

  const temp = document.createElement("table");
  temp.className = "data-table";

  const box = document.createElement("div");
  box.className = "data-box";
  box.appendChild(temp);

  const topRow = temp.insertRow(-1);
  for (let tc = 0; tc < 7; tc++) {
    const th = topRow.insertCell(-1);
    th.style.border = "none";
    th.style.textAlign = "center";
    th.style.color = "white";
    th.style.fontSize = "14px";
    if (tc === 1) {
      th.colSpan = 2;
      th.textContent = "Criteria";
      tc++;
      continue;
    }
    if (tc === 3) {
      th.colSpan = 4;
      th.textContent = "Scores";
      tc++;
      continue;
    }
  }

  for (let i = 0; i < critData.length + 1; i++) {
    const row = temp.insertRow(-1);

    for (let j = 0; j < 7; j++) {
      const cell = row.insertCell(-1);
      cell.style.border = "1.5px solid #000000cc";
      cell.style.textAlign = "center";
      cell.style.height = "0px";
      cell.style.padding = "0px";

      if (i == 0) {
        cell.style.background = "#006eb3ff";
        cell.style.color = "white";
      } else {
        cell.style.background = critPal[critData[i - 1].id];
      }

      let text = "";

      switch (j) {
        case 0: {
          cell.style.textAlign = "right";
          cell.style.width = "30px";
          cell.style.padding = "0px 8px 0px 8px";
          cell.style.background = "transparent";
          cell.style.border = "none";
          if (i > 0) {
            const miniCanvas = document.createElement("canvas");
            miniCanvas.width = 30;
            miniCanvas.height = 30;

            const ctx = miniCanvas.getContext("2d")!;
            ctx.filter = "invert(100%)";

            drawIcon(0, 0, 0, critData[i - 1].id, inputIcons, miniCanvas);
            cell.appendChild(miniCanvas);
          }

          break;
        }
        case 1: {
          cell.style.textAlign = "right";
          cell.style.padding = "0px 8px 0px 8px";
          if (i == 0) text = "Name";
          else {
            text = critData[i - 1].name;
          }

          break;
        }
        case 2: {
          cell.style.width = "80px";
          if (i == 0) text = "Weight";
          else {
            if (critData[i - 1].total == 0) {
              text = "0%";
            } else {
              text =
                (Math.floor(critData[i - 1].weight / sumScore * 10000) / 100) +
                "%";
            }
          }
          break;
        }
        case 3: {
          cell.style.width = "5px";
          cell.style.padding = "0";
          cell.style.background = "transparent";
          cell.style.border = "none";
          break;
        }
        case 4: {
          cell.style.width = "130px";
          if (i == 0) text = "Hit Score";
          else {
            let hittxt = critData[i - 1].minscore.toString();
            if (critData[i - 1].minscore != critData[i - 1].maxscore) {
              hittxt += " - " + critData[i - 1].maxscore.toString();
            }
            text = hittxt;
          }
          break;
        }
        case 5: {
          cell.style.width = "120px";
          if (i == 0) text = "Total Score";
          else {
            text = (critData[i - 1].total * 100).toString();
          }
          break;
        }
        case 6: {
          cell.style.width = "160px";
          if (i == 0) text = "Result";
          else {
            let restxt = (Math.floor(critData[i - 1].minresult * 100) / 100)
              .toString() +
              "%";
            if (critData[i - 1].minscore != critData[i - 1].maxscore) {
              restxt += " - " +
                (Math.floor(critData[i - 1].maxresult * 100) / 100)
                  .toString() +
                "%";
            }
            text = restxt;
          }
          break;
        }
      }

      if (j > 0 && j !== 3) cell.appendChild(document.createTextNode(text));
    }
  }

  dataTable.replaceWith(box);
  dataTable = box;
}

function badRounding(n: number) {
  return n > 0 ? Math.floor(n * 10000) / 10000 : Math.ceil(n * 10000) / 10000;
}

btnIcons.onload = () => updatePage(true);
inputIcons.onload = () => updatePage(true);
meter.onload = () => updatePage(true);
gameIcons.onload = () => updatePage(true);
starIcons.onload = () => updatePage(true);
document.fonts.ready.then(() => {
  updatePage(true);
});

globalThis.addEventListener("resize", updatePage.bind(null, true));

chartCanvas.addEventListener("mousemove", (e) => {
  if (mouseFocus == 6) {
    selectX = -1;

    scrollBarX = e.offsetX - scrollBarDrag;
    scrollBarX = Math.max(
      selectOffsetX,
      Math.min(scrollBarX, chartCanvas.width - scrollBarW),
    );

    scrollX = (scrollBarX - selectOffsetX) /
      ((chartCanvas.width - selectOffsetX) / (gd.inputs.length * tileSize));

    updatePage(true);

    return;
  }

  if (mouseFocus == 5) {
    selectX = -1;
    selectY = -1;

    scrollX = dragStartScrollX + (dragStartX - e.offsetX);

    scrollX = Math.max(
      0,
      Math.min(
        scrollX,
        Math.max(
          0,
          gd.inputs.length * tileSize - (chartCanvas.width - selectOffsetX),
        ),
      ),
    );

    scrollBarX = selectOffsetX +
      scrollX *
        ((chartCanvas.width - selectOffsetX) / (gd.inputs.length * tileSize));
    updatePage(true);
    return;
  }

  selectX =
    Math.floor((e.offsetX - selectOffsetX + (scrollX % 30)) / tileSize) +
    Math.floor(scrollX / tileSize);
  selectY = Math.floor(e.offsetY / 30) - critData.length - 1;

  if (selectX > gd.inputs.length - 1) {
    selectX = -1;
  }

  const sliderTop = (critData.length + 2) * tileSize + 5;
  const rawSliderPos = Math.floor((e.offsetY + 7) / 10) * 10 - 5;

  sliderY = ((Math.max(rawSliderPos, sliderTop)) - sliderTop) /
    10;

  document.body.style.cursor = "default";
  if (e.offsetX > selectOffsetX && selectY < 0) {
    document.body.style.cursor = "grab";
  }

  if (selectY < -1) selectY = -1;

  if (e.offsetX <= selectOffsetX) {
    mouseFocus = 0;
    selectX = -1;
  }
  if (selectX != -1) {
    if (btnData[selectX].active) {
      if (mouseFocus == 2 && selectY == 0) {
        btnData[selectX].pressed = drawState;
        if (prevSelectX != selectX || prevY != e.offsetY) updatePage(true);
      } else if (
        (mouseFocus == 3 || mouseFocus == 4) && btnData[selectX].pressed &&
        !debugMode
      ) {
        btnData[selectX].slider = Math.min(sliderY, 6);
        mouseFocus = 4;

        updatePage(true);
      } else {
        if (prevSelectX != selectX || prevY != e.offsetY) updatePage(false);
      }
    } else {
      if (prevSelectX != selectX || prevY != e.offsetY) updatePage(false);
    }
  } else {
    updatePage(false);
  }

  prevSelectX = selectX;
  prevY = e.offsetY;
});

chartCanvas.addEventListener("mousedown", (e) => {
  dragStartX = e.offsetX;
  dragStartScrollX = scrollX;
  mouseFocus = 5;
  document.body.style.cursor = "grabbing";

  if (e.offsetX >= selectOffsetX && e.offsetY >= chartCanvas.height - 10) {
    document.body.style.cursor = "default";
    mouseFocus = 6;
    selectX = -1;

    if (e.offsetX < scrollBarX || e.offsetX > scrollBarX + scrollBarW) {
      scrollBarDrag = scrollBarW / 2;

      scrollBarX = e.offsetX - scrollBarDrag;
      scrollBarX = Math.max(
        selectOffsetX,
        Math.min(scrollBarX, chartCanvas.width - scrollBarW),
      );
      scrollX = (scrollBarX - selectOffsetX) /
        ((chartCanvas.width - selectOffsetX) / (gd.inputs.length * tileSize));

      scrollBarDrag = e.offsetX - scrollBarX;
    } else {
      scrollBarDrag = e.offsetX - scrollBarX;
    }

    updatePage(true);
    return;
  }

  if (e.offsetX < selectOffsetX || (!btnData[selectX].active && selectY > -1)) {
    document.body.style.cursor = "default";
    mouseFocus = 1;
    return;
  }

  if (selectY > -1) document.body.style.cursor = "default";
  else selectX = -1;

  if (selectY == 0) {
    mouseFocus = 2;
    drawState = !btnData[selectX].pressed;

    btnData[selectX].pressed = !btnData[selectX].pressed;
  } else if (selectY > 0) {
    if (gd.inputs[selectX].multi == 0 || !btnData[selectX].pressed) {
      mouseFocus = 1;
      return;
    }

    if (debugMode) {
      mouseFocus = 3;
      if (btnData[selectX].pressed && btnData[selectX].active) {
        const debugPrompt = prompt(
          "Enter number:",
          btnData[selectX].debug.toString(),
        );

        if (debugPrompt !== null && isFinite(Number(debugPrompt))) {
          btnData[selectX].debug = Math.floor(Number(debugPrompt));
        }

        updatePage(true);
      }
    } else {
      if (
        selectX == starPos && e.offsetY > (critData.length + 5) * tileSize - 18
      ) {
        mouseFocus = 1;
        if (starActive) starPressed = !starPressed;
      } else {
        mouseFocus = 3;
        btnData[selectX].slider = Math.min(sliderY, 6);
      }
    }

    updatePage(true);
  }

  if (document.body.style.cursor) {
    updatePage(true);
  }
});

chartCanvas.addEventListener("mouseup", (e) => {
  if (e.offsetX > selectOffsetX && selectY < 0) {
    document.body.style.cursor = "grab";
  }
  if (mouseFocus == 5) {
    selectX =
      Math.floor((e.offsetX - selectOffsetX + (scrollX % 30)) / tileSize) +
      Math.floor(scrollX / tileSize);
    selectY = Math.floor(e.offsetY / 30) - critData.length - 1;
  }

  if (!debugMode) {
    if (mouseFocus == 3 || mouseFocus == 4) {
      if (e.offsetY < (critData.length + 2) * tileSize + 72) {
        if (btnData[selectX].active && btnData[selectX].pressed) {
          btnData[selectX].slider = Math.min(sliderY, 6);
        }
      }
    }
  }

  mouseFocus = 0;
  updatePage(true);
});

chartCanvas.addEventListener("mouseleave", () => {
  document.body.style.cursor = "default";
  selectX = -1;
  selectY = -1;
  prevSelectX = selectX;
  prevY = selectY;
  mouseFocus = 0;
  updatePage(false);
});

function drawIcon(
  x: number,
  y: number,
  ix: number,
  iy: number,
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, ix * 30, iy * 30, 30, 30, x, y, 30, 30);
}

function drawGameImg(index: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 44;
  canvas.height = 46;
  const ctx = canvas.getContext("2d")!;

  const img = new Image();
  img.src = gameimg;
  img.onload = () => {
    ctx.drawImage(img, index * 44, 0, 44, 46, 0, 0, 44, 46);
  };
  return canvas;
}

{
  const select = gameSelect as HTMLElement;
  const selected = select.querySelector(".selected") as HTMLElement;
  const optionsContainer = select.querySelector(".options") as HTMLElement;

  optionsContainer.style.maxHeight = "600px";
  optionsContainer.style.overflowY = "auto";

  const firstOption = gd;
  selected.innerHTML = "";
  selected.appendChild(drawGameImg(gd.image));
  selected.append(firstOption.name);
  selected.dataset.value = currGame.toString();
  selected.style.gap = "4px";
  selected.style.letterSpacing = "0px";
  selected.style.borderRadius = "10px";
  selected.style.color = "white";

  gameData.forEach((game, i) => {
    const option = document.createElement("div");
    option.className = "option";
    option.style.gap = "8px";
    option.style.letterSpacing = "0px";
    option.dataset.value = i.toString();
    option.appendChild(drawGameImg(game.image));
    option.append(game.name);

    option.style.backgroundColor = "#9900fe";

    if (option.dataset.value === selected.dataset.value) {
      option.style.backgroundColor = "#7500c2";
    }

    option.addEventListener("mouseenter", () => {
      option.style.backgroundColor = "#4040ff";
    });

    option.addEventListener("mouseleave", () => {
      if (option.dataset.value === selected.dataset.value) {
        option.style.backgroundColor = "#7500c2";
      } else {
        option.style.backgroundColor = "#9900fe";
      }
    });

    option.addEventListener("click", () => {
      selected.innerHTML = "";
      selected.appendChild(drawGameImg(game.image));
      selected.append(game.name);
      selected.dataset.value = option.dataset.value;

      optionsContainer.classList.remove("open");

      if (currGame != i) {
        currGame = i;
        saveState();
        loadGame(currGame);
      }

      const allOptions = optionsContainer.querySelectorAll(
        ".option",
      ) as NodeListOf<HTMLElement>;
      allOptions.forEach((opt) => {
        opt.style.backgroundColor = opt.dataset.value === selected.dataset.value
          ? "#7500c2"
          : "#9900fe";
      });
    });

    optionsContainer.appendChild(option);
  });

  selected.addEventListener("mouseenter", () => {
    selected.style.backgroundColor = "#b950ffff";
  });

  selected.addEventListener("mouseleave", () => {
    selected.style.backgroundColor = "#9900fe";
  });

  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    optionsContainer.classList.toggle("open");

    if (optionsContainer.classList.contains("open")) {
      const selectedOption = optionsContainer.querySelector(
        `.option[data-value="${selected.dataset.value}"]`,
      ) as HTMLElement;

      if (selectedOption) {
        selectedOption.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!select.contains(e.target as Node)) {
      optionsContainer.classList.remove("open");
    }
  });
}

fillBtn.addEventListener("click", () => {
  btnData.forEach((b: Button) => {
    b.active = true;
    b.pressed = true;
    b.slider = 3;
    b.minacc = 100;
    b.maxacc = 100;
    b.debug = 100;
  });
  updatePage(true);
});

clearBtn.addEventListener("click", () => {
  btnData.forEach((b: Button) => {
    b.pressed = false;
    b.slider = 3;
  });
  updatePage(true);
});

debugBtn.addEventListener("click", () => {
  debugMode = !debugMode;
  debugBtn.textContent = "Debug: " + (debugMode ? "ON" : "OFF");
  updatePage(true);
});
