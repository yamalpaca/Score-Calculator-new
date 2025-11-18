// netstat -ano | findstr :3000
// cd C:\Users\dstis\Downloads\Score-Calculator-main\Score-Calculator-main; & "$env:USERPROFILE\.deno\bin\deno.exe" task dev -- --port 5173

import btnimg from "./btnimg.png";
import { gameData } from "./gamedata.ts";
import meterimg from "./meterimg.png";
import pntimg from "./pntimg.png";
import gameimg from "./gameicons.png";
import "./style.css";

const customFont = new FontFace("SeuratPro", "/src/FOT-SeuratPro-B.otf");
document.fonts.add(customFont);

interface Criteria {
  id: number;
  name: string;
  weight: number;
  hits: number;
  score: number;
  total: number;
  result: number;
}

const critPal: string[] = [
  "#ABC8FF",
  "#AAFF9B",
  "#FF9D9D",
  "#F0BAFF",
  "#FFE002",
];

const tileSize: number = 30;
const selectOffsetX: number = 90;
const loadDist = 1;

let currGame = 1;

let gd = gameData[currGame];
let pressCounter: number;
let finalScore: number;
let prevScore: number;
let selectX: number;
let prevSelectX: number;
let selectY: number;
let prevSelectY: number;
let maxWidth: number;
let scrollX: number;
let dragStartX: number;
let dragStartScrollX: number;
let drawState: boolean;
let drawAccState: number;
let mouseFocus: number;

const critData: Criteria[] = [];

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

const diffText = document.createElement("p");
diffText.className = "diff-text";
chartTextRow.append(diffText);

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

let dataTable = document.createElement("div");
chartContainer.append(dataTable);

const creditsText = document.createElement("h1");
creditsText.textContent = "yamalpaca - v.0.1.3";
creditsText.className = "credits";
document.body.append(creditsText);

const btnIcons = new Image();
btnIcons.src = btnimg;
const pntIcons = new Image();
pntIcons.src = pntimg;
const meter = new Image();
meter.src = meterimg;
const gameIcons = new Image();
gameIcons.src = gameimg;

const btnPressed: boolean[] = [];
const btnAccuracy: number[] = [];

function loadGame(index: number) {
  gd = gameData[index];

  mouseFocus = 0;
  selectX = -1;
  prevSelectX = -1;
  selectY = -1;
  prevSelectY = -1;
  mouseFocus = 0;
  scrollX = 0;
  finalScore = 100;
  prevScore = 100;
  critData.splice(0, critData.length);
  btnPressed.splice(0, btnPressed.length);
  btnAccuracy.splice(0, btnAccuracy.length);
  btnPressed.push(...Array(gd.inputs.length).fill(true));
  btnAccuracy.push(...Array(gd.inputs.length).fill(100));

  diffText.textContent = "";

  updatePage(true);
}
loadGame(currGame);

function updatePage(all: boolean) {
  if (all) {
    updateData();

    chartCanvas.width = (gd.inputs.length * tileSize) + selectOffsetX;

    if (chartCanvas.width > (40.5 * tileSize) + selectOffsetX) {
      chartCanvas.width = (40.5 * tileSize) + selectOffsetX;
    }

    if (chartCanvas.width > globalThis.innerWidth - 15) {
      chartCanvas.width = globalThis.innerWidth - 15;
    }
    chartCanvas.height = tileSize * (critData.length + 3);

    maxWidth = Math.floor((chartCanvas.width - selectOffsetX) / tileSize);

    drawChart();
    updateText();
    drawMeterCanvas();
  }

  drawInterface();
  drawHeader();
}

function updateData() {
  critData.splice(0, critData.length);
  prevScore = finalScore;
  finalScore = 0;
  pressCounter = 0;

  for (let i: number = 0; i < gd.critweight.length; i++) {
    critData.push({
      id: i == gd.critweight.length - 1 ? 4 : i,
      name: i == gd.critweight.length - 1 ? "Skill Star" : gd.critname[i],
      weight: gd.critweight[i],
      hits: 0,
      score: 0,
      total: 0,
      result: 0,
    });
  }

  for (let i: number = 0; i < gd.inputs.length; i++) {
    critData[gd.inputs[i].criteria].total++;
    if (btnPressed[i]) {
      pressCounter++;
      critData[gd.inputs[i].criteria].hits++;
      critData[gd.inputs[i].criteria].score += btnAccuracy[i];
    }
  }

  critData.forEach((c: Criteria) => {
    c.result = badRounding(c.score / (c.total * 100)) * c.weight;
    finalScore += c.result;
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
  ctx.lineTo(selectOffsetX - 1, (critData.length + 3) * tileSize);
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
      pntIcons,
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
  ctx.fillText(
    "Timing",
    selectOffsetX - 7,
    (critData.length + 3) * tileSize - 9,
  );

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

  const sepimg = gd.separators?.find((s) => s.img);

  for (let i: number = -loadDist; i < maxWidth + loadDist + 1; i++) {
    const ioffset = i + Math.floor(scrollX / tileSize);

    if (!gd.inputs[ioffset]) continue;

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

    const sep = gd.separators?.find((s) => s.index === ioffset);
    if (sep) {
      const drawX = (ioffset * tileSize) + selectOffsetX - scrollX;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "white";
      ctx.filter = "";

      if (sep.index > 0) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(drawX, 0);
        ctx.lineTo(drawX, tileSize);
        ctx.stroke();
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(drawX, tileSize);
        ctx.lineTo(drawX, (critData.length + 1) * tileSize);
        ctx.stroke();
        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(drawX, (critData.length + 1) * tileSize);
        ctx.lineTo(drawX, (critData.length + 3) * tileSize);
        ctx.stroke();
      }

      if (sep.msg) {
        ctx.filter = "brightness(75%)";
        ctx.textAlign = "left";
        ctx.fillText(
          sep.msg,
          (ioffset * tileSize) + selectOffsetX - scrollX + 4,
          28,
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

    ctx.filter = "brightness(100%)";
    const iindex = gd.inputs[ioffset].criteria == critData.length - 1
      ? 4
      : gd.inputs[ioffset].criteria;
    const itype = btnPressed[ioffset] ? 1 : 4;

    drawIcon(
      (i * tileSize) + selectOffsetX - (scrollX % 30),
      (gd.inputs[ioffset].criteria + 1) * tileSize,
      itype,
      iindex,
      pntIcons,
      chartCanvas,
    );
  }

  ctx.filter = "none";
}

function drawInterface() {
  const ctx = chartCanvas.getContext("2d")!;
  if (!ctx) return;

  ctx.fillStyle = "#141414ff";
  ctx.fillRect(
    selectOffsetX,
    tileSize * (critData.length + 1),
    gd.inputs.length * tileSize,
    tileSize * 2,
  );

  if (selectX > -1 && selectX < gd.inputs.length) {
    ctx.fillStyle = "#ffffff30";
    ctx.fillRect(
      ((selectX - Math.floor(scrollX / tileSize)) * tileSize) + selectOffsetX -
        (scrollX % 30),
      tileSize * (critData.length + 1),
      tileSize,
      tileSize * 2,
    );
  }

  for (let i: number = -loadDist; i < maxWidth + loadDist + 1; i++) {
    const ioffset = i + Math.floor(scrollX / tileSize);

    if (!gd.inputs[ioffset]) continue;

    const sep = gd.separators?.find((s) => s.index === ioffset);
    if (sep) {
      if (sep.index > 0) {
        const drawX = (ioffset * tileSize) + selectOffsetX - scrollX;
        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(drawX, (critData.length + 1) * tileSize);
        ctx.lineTo(drawX, (critData.length + 3) * tileSize);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    ctx.filter = "brightness(100%)";

    if (selectX == ioffset && selectY == 0) {
      ctx.filter = "brightness(150%)";
      if (mouseFocus != 0) ctx.filter = "brightness(75%)";
    }

    if (!btnPressed[ioffset]) ctx.filter += "grayscale(100%)";

    drawIcon(
      (i * tileSize) + selectOffsetX - (scrollX % 30),
      (critData.length + 1) * tileSize,
      gd.inputs[ioffset].button,
      0,
      btnIcons,
      chartCanvas,
    );

    ctx.filter = "brightness(100%)";
    ctx.fillStyle = "white";
    ctx.letterSpacing = "1px";
    ctx.textAlign = "center";
    ctx.font = "12px Arial";

    if (!btnPressed[ioffset]) ctx.filter = "brightness(50%)";

    ctx.fillText(
      btnAccuracy[ioffset].toString(),
      (i * tileSize) + selectOffsetX + 15 - (scrollX % 30),
      (critData.length + 2) * tileSize + 20,
    );
  }
  ctx.filter = "none";
}

function drawMeterCanvas() {
  const ctx = meterCanvas.getContext("2d")!;
  if (!ctx || !scoreText) return;

  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(9, 9, 214, 30);

  scoreText.style.color = "#00B4FF";

  if (+scoreText.textContent > 60) {
    if (+scoreText.textContent > 80) {
      ctx.fillStyle = "#FF0000";
      ctx.fillRect(9, 9, 214 * (+scoreText.textContent / 100), 30);
      ctx.fillStyle = "#00BE00";
      ctx.fillRect(9, 9, 214 * 0.8, 30);
    } else {
      ctx.fillStyle = "#00BE00";
      ctx.fillRect(9, 9, 214 * (+scoreText.textContent / 100), 30);
    }

    ctx.fillStyle = "#00B4FF";
    ctx.fillRect(9, 9, 214 * 0.6, 30);
  } else {
    ctx.fillStyle = "#00B4FF";
    ctx.fillRect(9, 9, 214 * (+scoreText.textContent / 100), 30);
  }

  if (+scoreText.textContent >= 80) {
    scoreText.style.color = "#FF0000";
  } else if (+scoreText.textContent >= 60) {
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
  if (!diffText) return;

  scoreText.textContent = Math.floor(finalScore).toString();
  pressText.textContent = "Presses: " + pressCounter.toString();
  if (finalScore != prevScore && prevScore !== undefined) {
    diffText.textContent = finalScore >= prevScore ? "+" : "";
    diffText.textContent += (finalScore - prevScore).toFixed(2).toString();
  }

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

            drawIcon(0, 0, 0, critData[i - 1].id, pntIcons, miniCanvas);
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
            text = critData[i - 1].weight + "%";
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
          cell.style.width = "120px";
          if (i == 0) text = "Hit Score";
          else {
            text = critData[i - 1].score.toString();
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
          cell.style.width = "120px";
          if (i == 0) text = "Result";
          else {
            text =
              (Math.floor(critData[i - 1].result * 10000) / 10000).toString() +
              "%";
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
pntIcons.onload = () => updatePage(true);
meter.onload = () => updatePage(true);
gameIcons.onload = () => updatePage(true);
document.fonts.ready.then(() => {
  updatePage(true);
});

globalThis.addEventListener("resize", updatePage.bind(null, true));

chartCanvas.addEventListener("mousemove", (e) => {
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
    updatePage(true);
    return;
  }

  selectX =
    Math.floor((e.offsetX - selectOffsetX + (scrollX % 30)) / tileSize) +
    Math.floor(scrollX / tileSize);
  selectY = Math.floor(e.offsetY / 30) - critData.length - 1;

  document.body.style.cursor = "default";
  if (e.offsetX > selectOffsetX && selectY < 0) {
    document.body.style.cursor = "grab";
  }

  if (selectY < -1) selectY = -1;

  if (e.offsetX < selectOffsetX) {
    mouseFocus = 0;
    selectX = -1;
  }

  if (mouseFocus == 2 && selectY == 0) {
    btnPressed[selectX] = drawState;
    if (prevSelectX != selectX || prevSelectY != selectY) updatePage(true);
  } else if ((mouseFocus == 3 || mouseFocus == 4)) {
    btnAccuracy[selectX] = drawAccState;
    if (selectX != prevSelectX || selectY != 1) {
      mouseFocus = 4;
    }
    if (prevSelectX != selectX || prevSelectY != selectY) updatePage(true);
  } else {
    if (prevSelectX != selectX || prevSelectY != selectY) updatePage(false);
  }
  prevSelectX = selectX;
  prevSelectY = selectY;
});

chartCanvas.addEventListener("mousedown", (e) => {
  dragStartX = e.offsetX;
  dragStartScrollX = scrollX;
  mouseFocus = 5;
  document.body.style.cursor = "grabbing";

  if (e.offsetX < selectOffsetX) {
    mouseFocus = 1;
    return;
  }

  if (selectY > -1) document.body.style.cursor = "default";
  else selectX = -1;

  if (selectY == 0) {
    mouseFocus = 2;
    drawState = !btnPressed[selectX];
    btnPressed[selectX] = !btnPressed[selectX];
  } else if (selectY == 1) {
    mouseFocus = 3;
    drawAccState = btnAccuracy[selectX];
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

  if (mouseFocus == 3 && btnPressed[selectX]) {
    const newNum = prompt(
      "Enter number 0-100",
      btnAccuracy[selectX].toString(),
    );
    if (!isNaN(Number(newNum))) btnAccuracy[selectX] = Number(newNum);
  }
  mouseFocus = 0;
  updatePage(true);
});

chartCanvas.addEventListener("mouseleave", () => {
  document.body.style.cursor = "default";
  selectX = -1;
  selectY = -1;
  prevSelectX = selectX;
  prevSelectY = selectY;
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

      currGame = i;
      loadGame(currGame);

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
  });

  document.addEventListener("click", (e) => {
    if (!select.contains(e.target as Node)) {
      optionsContainer.classList.remove("open");
    }
  });
}
