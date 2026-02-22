(() => {
 const gridEl = document.getElementById('grid');
 const gridSizeSel = document.getElementById('gridSize');
 const paintModeSel = document.getElementById('paintMode');
 const terrainSel = document.getElementById('terrainType');
 const clearBtn = document.getElementById('clearBtn');
 const findBtn = document.getElementById('findBtn');
 const explainBox = document.getElementById('explain');
 const exportBtn = document.getElementById('exportBtn');
 const importBtn = document.getElementById('importBtn');
 const importFile = document.getElementById('importFile');


 // --- State ---
 let size = parseInt(gridSizeSel.value, 10) || 10;
 let grid = [];
 let start = null, goal = null;


 // --- Terrain Movement Costs ---
 const terrainCosts = {
   road: 1,
   grass: 2,
   forest: 4,
   mountain: 7,
   water: Infinity
 };


 // --- Initialize Grid ---
 function initGrid(n) {
   size = n;
   gridEl.style.gridTemplateColumns = `repeat(${n}, 36px)`;
   gridEl.innerHTML = '';
   grid = new Array(n);


   for (let r = 0; r < n; r++) {
     grid[r] = new Array(n);
     for (let c = 0; c < n; c++) {
       const cell = { r, c, terrain: 'grass', el: null };
       const div = document.createElement('div');
       div.className = 'cell grass';
       div.dataset.r = r;
       div.dataset.c = c;
       div.title = `${r},${c}`;
       div.addEventListener('click', onCellClick);
       cell.el = div;
       grid[r][c] = cell;
       gridEl.appendChild(div);
     }
   }


   // Default start and goal positions
   setCellStart(0, 0);
   setCellGoal(size - 1, size - 1);


   explain('Grid initialized.');
 }


 // --- Helpers ---
 function explain(msg) {
   explainBox.textContent = msg;
 }


 function nodeKey(n) {
   return `${n.r},${n.c}`;
 }


 function parseKey(key) {
   const [r, c] = key.split(',').map(Number);
   return { r, c };
 }


 // --- Cell Operations ---
 function setCellTerrain(r, c, terrain) {
   if (start && start.r === r && start.c === c) {
     explain('Cannot change terrain of Start cell.');
     return;
   }
   if (goal && goal.r === r && goal.c === c) {
     explain('Cannot change terrain of Goal cell.');
     return;
   }


   const cell = grid[r][c];
   cell.terrain = terrain;
   cell.el.className = 'cell ' + terrain;
 }


 function setCellStart(r, c) {
   if (grid[r][c].terrain === 'water') {
     explain('Cannot place Start on water.');
     return;
   }
   if (start) grid[start.r][start.c].el.classList.remove('start');
   start = { r, c };
   grid[r][c].el.classList.add('start');
   explain(`Start set at (${r},${c})`);
 }


 function setCellGoal(r, c) {
   if (grid[r][c].terrain === 'water') {
     explain('Cannot place Goal on water.');
     return;
   }
   if (goal) grid[goal.r][goal.c].el.classList.remove('goal');
   goal = { r, c };
   grid[r][c].el.classList.add('goal');
   explain(`Goal set at (${r},${c})`);
 }


 // --- Handle Cell Clicks ---
 function onCellClick() {
   const r = Number(this.dataset.r);
   const c = Number(this.dataset.c);
   const mode = paintModeSel.value;


   if (mode === 'start') return setCellStart(r, c);
   if (mode === 'goal') return setCellGoal(r, c);
   if (mode === 'erase') return setCellTerrain(r, c, 'grass');


   setCellTerrain(r, c, terrainSel.value);
 }


 // --- Neighbor Calculation (4-directional) ---
 function neighbors(node) {
   const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
   const res = [];
   for (const [dr, dc] of deltas) {
     const nr = node.r + dr;
     const nc = node.c + dc;
     if (nr >= 0 && nc >= 0 && nr < size && nc < size) {
       if (grid[nr][nc].terrain !== 'water') res.push({ r: nr, c: nc });
     }
   }
   return res;
 }


 // --- Heuristic (Manhattan Distance) ---
 function heuristic(a, b) {
   return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
 }


 // --- Pathfinding (A*) ---
 function findPath() {
   if (!start || !goal) return explain('Set start and goal.');


   // Clear visuals
   for (let r = 0; r < size; r++)
     for (let c = 0; c < size; c++) {
       grid[r][c].el.classList.remove('path', 'visited');
     }


   const sKey = nodeKey(start);
   const gKey = nodeKey(goal);


   const cameFrom = {};
   const gScore = {};
   const fScore = {};


   // Initialize scores
   for (let r = 0; r < size; r++)
     for (let c = 0; c < size; c++) {
       const k = `${r},${c}`;
       gScore[k] = Infinity;
       fScore[k] = Infinity;
     }


   gScore[sKey] = 0;
   fScore[sKey] = heuristic(start, goal);


   const open = [sKey];


   while (open.length) {
     let currentKey = open.reduce((a, b) => (fScore[a] < fScore[b] ? a : b));
     const current = parseKey(currentKey);
     grid[current.r][current.c].el.classList.add('visited');


     if (currentKey === gKey) {
       // --- Reconstruct Path ---
       const pathKeys = [currentKey];
       let k = currentKey;
       while (cameFrom[k]) {
         k = cameFrom[k];
         pathKeys.push(k);
       }
       pathKeys.reverse();


       // --- Compute total cost & terrain breakdown ---
       let total = 0;
       const terrainsUsed = { road: 0, grass: 0, forest: 0, mountain: 0 };


       for (let i = 1; i < pathKeys.length; i++) {
         const node = parseKey(pathKeys[i]);
         const terrain = grid[node.r][node.c].terrain;
         const cost = terrainCosts[terrain] || 0;
         total += cost;
         if (terrainsUsed[terrain] !== undefined) terrainsUsed[terrain]++;
       }


       // --- Animate path drawing ---
       let i = 1;
       function animatePath() {
         if (i < pathKeys.length) {
           const node = parseKey(pathKeys[i]);
           if (!(node.r === start.r && node.c === start.c) &&
               !(node.r === goal.r && node.c === goal.c)) {
             grid[node.r][node.c].el.classList.add('path');
           }
           i++;
           setTimeout(animatePath, 60); // animation speed (ms per cell)
         }
       }
       animatePath();


       // --- Risk Analysis ---
       const riskScore = terrainsUsed.forest * 2 + terrainsUsed.mountain * 4;
       let riskLevel = 'Safe';
       if (riskScore > 10) riskLevel = 'Moderate Risk';
       if (riskScore > 20) riskLevel = 'High Risk';


       // --- Display Info ---
       const reason = 'A* selected this path by minimizing total movement cost while avoiding blocked cells.';
       explain(
         `Path found!\nSteps: ${pathKeys.length}\n` + `Total Cost: ${total.toFixed(1)}\n` +
         `Terrain Breakdown:\n` + `Road: ${terrainsUsed.road}\n` + `Grass: ${terrainsUsed.grass}\n` +
         `Forest: ${terrainsUsed.forest}\n` + `Mountain: ${terrainsUsed.mountain}\n` +
         `Risk Level: ${riskLevel}\n\nExplanation: ${reason}`
       );
       return;
     }


     // Remove current from open
     open.splice(open.indexOf(currentKey), 1);


     // Explore neighbors
     for (const nb of neighbors(current)) {
       const nbKey = nodeKey(nb);
       const terrain = grid[nb.r][nb.c].terrain;
       const moveCost = terrainCosts[terrain];
       const tentativeG = gScore[currentKey] + moveCost;


       if (tentativeG < gScore[nbKey]) {
         cameFrom[nbKey] = currentKey;
         gScore[nbKey] = tentativeG;
         fScore[nbKey] = tentativeG + heuristic(nb, goal);
         if (!open.includes(nbKey)) open.push(nbKey);
       }
     }
   }


   explain('No path found. (Blocked terrain or isolated goal)');
 }


 // --- Export / Import ---
 function exportMap() {
   const data = { size, start, goal, cells: [] };
   for (let r = 0; r < size; r++)
     for (let c = 0; c < size; c++)
       data.cells.push({ r, c, terrain: grid[r][c].terrain });


   const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'map.json';
   a.click();
   URL.revokeObjectURL(url);
 }


 function importMapFile(file) {
   const reader = new FileReader();
   reader.onload = e => {
     try {
       const data = JSON.parse(e.target.result);
       initGrid(data.size || size);
       if (data.cells) {
         for (const cell of data.cells) {
           if (cell.r >= 0 && cell.r < size && cell.c >= 0 && cell.c < size)
             setCellTerrain(cell.r, cell.c, cell.terrain || 'grass');
         }
       }
       if (data.start) setCellStart(data.start.r, data.start.c);
       if (data.goal) setCellGoal(data.goal.r, data.goal.c);
       explain('Map imported.');
     } catch {
       explain('Invalid map file.');
     }
   };
   reader.readAsText(file);
 }


 // --- Event Bindings ---
 gridSizeSel.addEventListener('change', () => {
   const v = parseInt(gridSizeSel.value, 10);
   if (Number.isInteger(v) && v > 1 && v <= 60) initGrid(v);
 });


 clearBtn.addEventListener('click', () => initGrid(size));
 findBtn.addEventListener('click', findPath);
 exportBtn.addEventListener('click', exportMap);
 importBtn.addEventListener('click', () => importFile.click());
 importFile.addEventListener('change', () => {
   if (importFile.files.length) importMapFile(importFile.files[0]);
 });


 // --- Start ---
 initGrid(size);
})();
