let gridSize = 10; // Make this variable instead of const
let grid = [];
let selectedCells = [];
let foundWords = new Set();
let words = [];
let NUM_WORDS = 5; // Now can be modified
let timerInterval;
let gameTime = 0;
let timerEnabled = false;
let highlightEnabled = true; // Add near the top with other global variables
let selectedLetter = 'a'; // Default to 'a' instead of 'all'
let highlightColor = '#4cd964';  // Default color matching the initial input value
let difficulty = 'medium';
let hintsRemaining = 3;
let hintTimeout = null;

// Add to global variables
let gameStats = {
    gamesPlayed: 0,
    currentStreak: 0,
    bestTime: Infinity
};

// Add to global variables
let darkMode = false;

// Add to global variables
let isTouchDevice = 'ontouchstart' in window;
let isSelecting = false;

const DIFFICULTY_SETTINGS = {
    easy: {
        directions: [[0, 1], [1, 0]], // Only horizontal and vertical
        extraPadding: 3, // More space around words
        reverseChance: 0 // No reverse words
    },
    medium: {
        directions: [[0, 1], [1, 0], [1, 1]], // No reverse diagonal
        extraPadding: 2,
        reverseChance: 0.3 // 30% chance of reverse words
    },
    hard: {
        directions: [[0, 1], [1, 0], [1, 1], [-1, 1]], // All directions
        extraPadding: 1,
        reverseChance: 0.5 // 50% chance of reverse words
    }
};

async function getRandomWords() {
    return await fetchWords(NUM_WORDS, selectedLetter);
}

async function initializeGrid() {
    const gameBoard = document.getElementById('game-board');
    const wordList = document.getElementById('word-list');
    
    // Add highlight class if enabled
    if (highlightEnabled) {
        gameBoard.classList.add('highlight-enabled');
    }

    // Show loading state
    gameBoard.innerHTML = '<div class="loading">Loading words...</div>';
    wordList.innerHTML = '';
    
    try {
        // Fetch words first
        words = await getRandomWords();
        
        // Debug log
        console.log('Fetched words:', words);
        
        if (!words || words.length === 0) {
            throw new Error('No words received');
        }

        // Display words ONCE
        words.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            li.setAttribute('data-word', word);
            wordList.appendChild(li);
        });

        // Determine grid size based on longest word
        const longestWordLength = Math.max(...words.map(w => w.length));
        gridSize = Math.max(longestWordLength + 2, 10); // At least 10x10 grid
        
        // Update grid CSS
        gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, 50px)`;
        
        // Clear existing content and reset foundWords
        gameBoard.innerHTML = '';
        foundWords.clear();
        grid = [];
        
        // Create empty grid
        for (let i = 0; i < gridSize; i++) {
            grid[i] = Array(gridSize).fill('');
        }

        // Place words
        words.forEach(word => {
            placeWord(word);
        });

        // Fill empty cells with random letters
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] === '') {
                    grid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                }
            }
        }

        // Create the visual grid
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = grid[i][j];
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                // Add both mouse and touch events
                cell.addEventListener('mousedown', handleSelectionStart);
                cell.addEventListener('mouseover', handleSelectionMove);
                cell.addEventListener('touchstart', handleSelectionStart, { passive: false });
                cell.addEventListener('touchmove', handleSelectionMove, { passive: false });
                
                gameBoard.appendChild(cell);
            }
        }

        // Add end selection events for both mouse and touch
        document.addEventListener('mouseup', handleSelectionEnd);
        document.addEventListener('touchend', handleSelectionEnd);

    } catch (error) {
        console.error('Error:', error);
        gameBoard.innerHTML = '<div class="error">Failed to load words. Please try again.</div>';
    }

    startTimer();
}

function canPlaceWord(word, row, col, [dx, dy]) {
    // Check if word extends beyond grid boundaries
    const endRow = row + (dx * (word.length - 1));
    const endCol = col + (dy * (word.length - 1));
    
    if (endRow >= gridSize || endRow < 0 || row >= gridSize || row < 0) return false;
    if (endCol >= gridSize || endCol < 0 || col >= gridSize || col < 0) return false;

    // Check if space is available
    for (let i = 0; i < word.length; i++) {
        const currentRow = row + (dx * i);
        const currentCol = col + (dy * i);
        const currentCell = grid[currentRow][currentCol];
        if (currentCell && currentCell !== word[i]) return false;
    }
    return true;
}

function placeWord(word) {
    // Add validation check
    if (word.length > gridSize) {
        console.error(`Word ${word} is too long for the grid`);
        return false;
    }

    // Possibly reverse the word based on difficulty
    if (Math.random() < DIFFICULTY_SETTINGS[difficulty].reverseChance) {
        word = word.split('').reverse().join('');
    }

    const directions = DIFFICULTY_SETTINGS[difficulty].directions;
    const padding = DIFFICULTY_SETTINGS[difficulty].extraPadding;

    const maxAttempts = 100;
    let attempts = 0;
    let placed = false;

    while (!placed && attempts < maxAttempts) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        // Adjust starting position based on word length and direction
        const maxRow = gridSize - (Math.abs(direction[0]) * word.length);
        const maxCol = gridSize - (Math.abs(direction[1]) * word.length);
        const row = Math.floor(Math.random() * (maxRow || gridSize));
        const col = Math.floor(Math.random() * (maxCol || gridSize));

        if (canPlaceWord(word, row, col, direction)) {
            placeWordInGrid(word, row, col, direction);
            placed = true;
        }
        attempts++;
    }

    if (!placed) {
        // Fallback: place horizontally at the first available row
        for (let row = 0; row < gridSize; row++) {
            if (canPlaceWord(word, row, 0, [0, 1])) {
                placeWordInGrid(word, row, 0, [0, 1]);
                return;
            }
        }
        console.error(`Failed to place word: ${word}`);
    }
}

function placeWordInGrid(word, row, col, [dx, dy]) {
    for (let i = 0; i < word.length; i++) {
        grid[row + dx * i][col + dy * i] = word[i];
    }
}

function handleSelectionStart(e) {
    e.preventDefault(); // Prevent default to avoid scrolling on mobile
    isSelecting = true;
    selectedCells = [];
    
    const cell = e.type.includes('touch') ? 
        document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) :
        e.target;
        
    if (cell && cell.classList.contains('cell')) {
        selectedCells = [cell];
        cell.classList.add('selected');
    }
}

function handleSelectionMove(e) {
    if (!isSelecting) return;
    e.preventDefault(); // Prevent scrolling on mobile

    const cell = e.type.includes('touch') ?
        document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) :
        e.target;

    if (!cell || !cell.classList.contains('cell')) return;
    
    // If the cell is the same as the last selected cell, do nothing
    if (selectedCells.length > 0 && cell === selectedCells[selectedCells.length - 1]) return;

    const lastCell = selectedCells[selectedCells.length - 1];
    
    // Apply the same adjacency and direction logic from updateSelection
    if (lastCell && areAdjacent(lastCell, cell)) {
        if (selectedCells.length === 1) {
            const [dx, dy] = getSelectionDirection(lastCell, cell);
            lastCell.dataset.dx = dx;
            lastCell.dataset.dy = dy;
        } else {
            const dx = parseInt(lastCell.dataset.dx);
            const dy = parseInt(lastCell.dataset.dy);
            const [newDx, newDy] = getSelectionDirection(lastCell, cell);
            
            if (newDx !== dx || newDy !== dy) return;
        }
        
        // Add the new cell
        selectedCells.push(cell);
        cell.classList.add('selected');
        cell.dataset.dx = lastCell.dataset.dx;
        cell.dataset.dy = lastCell.dataset.dy;
    }
}

function handleSelectionEnd(e) {
    if (!isSelecting) return;
    isSelecting = false;
    
    // Process the selection
    endSelection();
}

function areAdjacent(cell1, cell2) {
    const row1 = parseInt(cell1.dataset.row);
    const col1 = parseInt(cell1.dataset.col);
    const row2 = parseInt(cell2.dataset.row);
    const col2 = parseInt(cell2.dataset.col);
    
    // Check if cells are adjacent (including diagonally)
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    
    // Cells must be adjacent and in a straight line
    return rowDiff <= 1 && colDiff <= 1;
}

function getSelectionDirection(cell1, cell2) {
    const row1 = parseInt(cell1.dataset.row);
    const col1 = parseInt(cell1.dataset.col);
    const row2 = parseInt(cell2.dataset.row);
    const col2 = parseInt(cell2.dataset.col);
    
    return [
        Math.sign(row2 - row1),
        Math.sign(col2 - col1)
    ];
}

function endSelection() {
    const word = selectedCells.map(cell => cell.textContent).join('');
    const reverseWord = word.split('').reverse().join('');

    if (words.includes(word) || words.includes(reverseWord)) {
        const foundWord = words.includes(word) ? word : reverseWord;
        if (!foundWords.has(foundWord)) {
            foundWords.add(foundWord);
            selectedCells.forEach(cell => {
                cell.classList.add('found');
                delete cell.dataset.dx;
                delete cell.dataset.dy;
            });
            document.querySelector(`[data-word="${foundWord}"]`).classList.add('word-found');
            document.getElementById('score').textContent = foundWords.size;
            checkGameCompletion();
        }
    }

    selectedCells.forEach(cell => {
        cell.classList.remove('selected');
        delete cell.dataset.dx;
        delete cell.dataset.dy;
    });
    selectedCells = [];
}

// Update checkGameCompletion function
function checkGameCompletion() {
    if (foundWords.size === words.length) {
        stopTimer();
        // Update statistics
        gameStats.gamesPlayed++;
        gameStats.currentStreak++;
        if (timerEnabled && gameTime < gameStats.bestTime) {
            gameStats.bestTime = gameTime;
        }
        saveGameStats();
        document.getElementById('congratulations-modal').classList.add('show');
    }
}

function resetGame() {
    document.getElementById('congratulations-modal').classList.remove('show');
    initializeGrid();
    
    // Reset hints
    hintsRemaining = 3;
    updateHintDisplay();
    document.getElementById('hintButton').disabled = false;

    if (foundWords.size !== words.length) {
        // Game was reset before completion, break the streak
        gameStats.currentStreak = 0;
        saveGameStats();
    }
}

function updateWordCount(count) {
    NUM_WORDS = parseInt(count);
    resetGame();
}

function toggleHighlight() {
    highlightEnabled = document.getElementById('highlightToggle').checked;
    const gameBoard = document.getElementById('game-board');
    if (highlightEnabled) {
        gameBoard.classList.add('highlight-enabled');
        // Apply current highlight color to all found words
        document.querySelectorAll('.found').forEach(cell => {
            cell.style.color = highlightColor;
        });
    } else {
        gameBoard.classList.remove('highlight-enabled');
        // Reset color to default gray
        document.querySelectorAll('.found').forEach(cell => {
            cell.style.color = '#9e9e9e';
        });
    }
}

function handleLetterSelect(event) {
    selectedLetter = event.target.value;
    resetGame();
}

// Update the updateHighlightColor function
function updateHighlightColor(color) {
    highlightColor = color;
    document.documentElement.style.setProperty('--highlight-color', color);
    localStorage.setItem('wordSearchHighlightColor', color);
    document.querySelectorAll('.found').forEach(cell => {
        if (highlightEnabled) {
            cell.style.color = color;
        }
    });
}

// Timer-related functions
function updateTimerDisplay() {
    const minutes = Math.floor(gameTime / 60).toString().padStart(2, '0');
    const seconds = (gameTime % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `Time: ${minutes}:${seconds}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTimer() {
    if (!timerEnabled) return;
    
    gameTime = 0;
    stopTimer();
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        gameTime++;
        updateTimerDisplay();
    }, 1000);
}

function toggleTimer() {
    timerEnabled = document.getElementById('timerToggle').checked;
    stopTimer();
    if (timerEnabled) {
        startTimer();
    } else {
        document.getElementById('timer').textContent = 'Time: 00:00';
    }
}

// Add new function to handle difficulty changes
function updateDifficulty(newDifficulty) {
    difficulty = newDifficulty;
    localStorage.setItem('wordSearchDifficulty', newDifficulty);
    resetGame();
}

// Add new hint functions
function useHint() {
    if (hintsRemaining <= 0) return;
    
    // Find unfound words
    const unfoundWords = words.filter(word => !foundWords.has(word));
    if (unfoundWords.length === 0) return;
    
    // Pick a random unfound word
    const hintWord = unfoundWords[Math.floor(Math.random() * unfoundWords.length)];
    const firstLetter = hintWord[0];
    
    // Find and highlight first letter of the word
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        if (cell.textContent === firstLetter) {
            cell.classList.add('hint-flash');
            // Remove flash after animation
            setTimeout(() => cell.classList.remove('hint-flash'), 1000);
        }
    });
    
    hintsRemaining--;
    updateHintDisplay();
    
    // Disable hint button if no hints remaining
    if (hintsRemaining <= 0) {
        document.getElementById('hintButton').disabled = true;
    }
}

function updateHintDisplay() {
    document.getElementById('hintCount').textContent = hintsRemaining;
}

// Add new statistics functions
function loadGameStats() {
    const savedStats = localStorage.getItem('wordSearchStats');
    if (savedStats) {
        gameStats = JSON.parse(savedStats);
        updateStatsDisplay();
    }
}

function saveGameStats() {
    localStorage.setItem('wordSearchStats', JSON.stringify(gameStats));
    updateStatsDisplay();
}

function updateStatsDisplay() {
    document.getElementById('gamesPlayed').textContent = gameStats.gamesPlayed;
    document.getElementById('winStreak').textContent = gameStats.currentStreak;
    document.getElementById('bestTime').textContent = gameStats.bestTime === Infinity ? 
        '-:--' : formatTime(gameStats.bestTime);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Add dark mode functions
function toggleDarkMode() {
    darkMode = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('wordSearchDarkMode', darkMode);
}

function loadDarkModePreference() {
    const savedDarkMode = localStorage.getItem('wordSearchDarkMode');
    if (savedDarkMode !== null) {
        darkMode = savedDarkMode === 'true';
        document.getElementById('darkModeToggle').checked = darkMode;
        document.body.classList.toggle('dark-mode', darkMode);
    }
}

// Update window.onload to include loading saved color and difficulty
window.onload = function() {
    document.getElementById('letterSelect').addEventListener('change', handleLetterSelect);
    
    // Load saved highlight color
    const savedColor = localStorage.getItem('wordSearchHighlightColor');
    if (savedColor) {
        highlightColor = savedColor;
        document.getElementById('highlightColor').value = savedColor;
    }
    
    document.documentElement.style.setProperty('--highlight-color', highlightColor);

    // Load saved difficulty
    const savedDifficulty = localStorage.getItem('wordSearchDifficulty');
    if (savedDifficulty) {
        difficulty = savedDifficulty;
        document.getElementById('difficultySelect').value = savedDifficulty;
    }
    
    loadDarkModePreference();
    initializeGrid();
    updateHintDisplay();
    loadGameStats();
};
