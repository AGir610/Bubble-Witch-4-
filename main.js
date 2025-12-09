// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Spielvariablen ---
let chapters = [];
let currentChapterIndex = 0;
let currentLevelIndex = 0;
let grid = [];
let shooter = {x: canvas.width/2, y: canvas.height-100, radius:25};
let shootBubble = null;
let aimPos = {x: shooter.x, y: shooter.y-200};
let bubbleRadius = 40;
let colors = ["R","G","B","P"];

// --- Kapitelübersicht UI ---
const chapterContainer = document.createElement("div");
chapterContainer.style.position="absolute";
chapterContainer.style.top="10px";
chapterContainer.style.left="10px";
chapterContainer.style.right="10px";
chapterContainer.style.background="rgba(0,0,0,0.4)";
chapterContainer.style.display="flex";
chapterContainer.style.overflowX="auto";
document.body.appendChild(chapterContainer);

// --- Lade Daten ---
fetch('data.json')
.then(res=>res.json())
.then(data=>{
    chapters = data.chapters;
    loadProgress();
    loadLevel();
    renderChapterButtons();
    gameLoop();
});

// --- Fortschritt laden ---
function loadProgress(){
    let p = JSON.parse(localStorage.getItem('bw4Progress'));
    if(p){
        currentChapterIndex = p.chapter;
        currentLevelIndex = p.level;
    }
}
function saveProgress(){
    localStorage.setItem('bw4Progress',JSON.stringify({chapter:currentChapterIndex, level:currentLevelIndex}));
}

// --- Kapitel Buttons ---
function renderChapterButtons(){
    chapterContainer.innerHTML="";
    chapters.forEach((c,i)=>{
        let btn = document.createElement("button");
        btn.innerText = c.title;
        btn.onclick=()=>{currentChapterIndex=i; currentLevelIndex=0; loadLevel();}
        chapterContainer.appendChild(btn);
    });
}

// --- Lade Level ---
function loadLevel(){
    let chapter = chapters[currentChapterIndex];
    if(!chapter.levels[currentLevelIndex]){
        // dynamische Levelgenerierung für Post-Level
        chapter.levels[currentLevelIndex]=generateRandomLevel();
    }
    let levelData = chapter.levels[currentLevelIndex];
    grid = [];
    for(let r=0;r<levelData.rows;r++){
        let row=[];
        for(let c=0;c<levelData.cols;c++){
            if(levelData.layout[r] && levelData.layout[r][c]) row.push(levelData.layout[r][c]);
            else row.push("-");
        }
        grid.push(row);
    }
    shootBubble = createBubble();
}

// --- Erstelle Bubble ---
function createBubble(){
    return {x:shooter.x, y:shooter.y, color:colors[Math.floor(Math.random()*colors.length)], vx:0, vy:0, moving:false};
}

// --- Dynamisches Level ---
function generateRandomLevel(){
    let rows=6, cols=8;
    let layout=[];
    for(let r=0;r<rows;r++){
        let row=[];
        for(let c=0;c<cols;c++){
            if(Math.random()<0.5) row.push(colors[Math.floor(Math.random()*colors.length)]);
            else row.push("-");
        }
        layout.push(row);
    }
    return {id:Date.now(), rows, cols, layout};
}

// --- Shooter Aim ---
canvas.addEventListener('mousemove',e=>{aimPos.x=e.clientX; aimPos.y=e.clientY;});
canvas.addEventListener('touchmove',e=>{e.preventDefault(); aimPos.x=e.touches[0].clientX; aimPos.y=e.touches[0].clientY;},{passive:false});

// --- Shoot ---
canvas.addEventListener('click',shoot);
canvas.addEventListener('touchstart',e=>{e.preventDefault(); shoot();},{passive:false});
function shoot(){
    if(!shootBubble.moving){
        let dx = aimPos.x-shooter.x, dy = aimPos.y-shooter.y;
        let mag = Math.sqrt(dx*dx+dy*dy);
        shootBubble.vx = dx/mag*15;
        shootBubble.vy = dy/mag*15;
        shootBubble.moving = true;
    }
}

// --- Game Loop ---
function gameLoop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawGrid();
    drawShooter();
    updateBubble();
    requestAnimationFrame(gameLoop);
}

// --- Grid zeichnen ---
function drawGrid(){
    for(let r=0;r<grid.length;r++){
        for(let c=0;c<grid[r].length;c++){
            let color=grid[r][c];
            if(color && color!="-"){
                ctx.fillStyle=colorToHex(color);
                ctx.beginPath();
                ctx.arc(c*bubbleRadius*1.05+bubbleRadius, r*bubbleRadius*1.05+bubbleRadius, bubbleRadius-2,0,Math.PI*2);
                ctx.fill();
            }
        }
    }
}

// --- Shooter zeichnen ---
function drawShooter(){
    ctx.fillStyle="#ffff00";
    ctx.beginPath();
    ctx.arc(shooter.x,shooter.y,shooter.radius,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle="#fff";
    ctx.beginPath();
    ctx.moveTo(shooter.x,shooter.y);
    ctx.lineTo(aimPos.x,aimPos.y);
    ctx.stroke();
    ctx.fillStyle=colorToHex(shootBubble.color);
    ctx.beginPath();
    ctx.arc(shootBubble.x,shootBubble.y,bubbleRadius-2,0,Math.PI*2);
    ctx.fill();
}

// --- Update Bubble ---
function updateBubble(){
    if(shootBubble.moving){
        shootBubble.x+=shootBubble.vx;
        shootBubble.y+=shootBubble.vy;
        if(shootBubble.x<bubbleRadius || shootBubble.x>canvas.width-bubbleRadius) shootBubble.vx*=-1;
        if(checkCollision()){
            attachBubble(shootBubble);
            shootBubble=createBubble();
        }
    }
}

// --- Kollision prüfen ---
function checkCollision(){
    if(shootBubble.y<bubbleRadius) return true;
    for(let r=0;r<grid.length;r++){
        for(let c=0;c<grid[r].length;c++){
            let color=grid[r][c];
            if(color && color!="-"){
                let gx=c*bubbleRadius*1.05+bubbleRadius;
                let gy=r*bubbleRadius*1.05+bubbleRadius;
                let dx=shootBubble.x-gx, dy=shootBubble.y-gy;
                if(Math.sqrt(dx*dx+dy*dy)<bubbleRadius*1.05) return true;
            }
        }
    }
    return false;
}

// --- Bubble an Grid anhängen ---
function attachBubble(b){
    let r=Math.floor(b.y/(bubbleRadius*1.05));
    let c=Math.floor(b.x/(bubbleRadius*1.05));
    if(r>=grid.length) r=grid.length-1;
    if(c>=grid[0].length) c=grid[0].length-1;
    if(!grid[r]) grid[r]=[];
    grid[r][c]=b.color;
    checkClusters(r,c,b.color);
}

// --- Cluster prüfen ---
function checkClusters(r,c,color){
    let visited=[];
    for(let i=0;i<grid.length;i++) visited[i]=[];
    let stack=[[r,c]], cluster=[];
    while(stack.length>0){
        let [x,y]=stack.pop();
        if(x<0||y<0||x>=grid.length||y>=grid[0].length) continue;
        if(visited[x][y]) continue;
        visited[x][y]=true;
        if(grid[x][y]===color){
            cluster.push([x,y]);
            stack.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);
        }
    }
    if(cluster.length>=3){
        for(let [x,y] of cluster) grid[x][y]="-";
    }
}

// --- Farbe in Hex ---
function colorToHex(c){
    switch(c){
        case "R": return "#ff0000";
        case "G": return "#00ff00";
        case "B": return "#0000ff";
        case "P": return "#800080";
        default: return "#fff";
    }
}
