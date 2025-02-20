const DEFAULT_WORDS = [
    'PYTHON', 'JAVASCRIPT', 'REACT', 'NODE', 'HTML',
    'CSS', 'JAVA', 'CODE', 'WEB', 'API', 'MYSQL',
    'LINUX', 'DOCKER', 'CLOUD', 'DATA', 'ARRAY',
    'LOOP', 'CLASS', 'SCRIPT', 'TEST', 'FUNCTION',
    'VARIABLE', 'STRING', 'NUMBER', 'BOOLEAN', 'OBJECT',
    'METHOD', 'RETURN', 'IMPORT', 'EXPORT', 'DEFAULT',
    'ASYNC', 'AWAIT', 'PROMISE', 'FETCH', 'DEBUG',
    'ERROR', 'SYNTAX', 'COMPILE', 'RUNTIME'
];

// Remove the CATEGORIES object
// Remove category-specific word lists

// Update fetchWords function to remove category parameter
async function fetchWords(count = 10, letter = 'a') {
    try {
        letter = letter.toLowerCase();
        const response = await fetch(`dictionary/${letter}.txt`);
        const fileContent = await response.text();
        
        // Split into lines and process each line
        const words = fileContent
            .split('\n')
            .map(line => {
                const match = line.match(/^(\w+)/);
                return match ? match[1].toUpperCase() : null;
            })
            .filter(word => {
                return word && 
                       word.length >= 3 && 
                       word.length <= 15 && 
                       /^[A-Z]+$/.test(word);
            });

        if (words.length < count) {
            return shuffleArray(DEFAULT_WORDS).slice(0, count);
        }

        return shuffleArray(words).slice(0, count);
    } catch (error) {
        console.log('Error reading words from file, using defaults:', error);
        return shuffleArray(DEFAULT_WORDS).slice(0, count);
    }
}

function shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

