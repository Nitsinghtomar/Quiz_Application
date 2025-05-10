// DOM Elements
const startScreen = document.querySelector('.start-screen');
const quizScreen = document.querySelector('.quiz-screen');
const resultsScreen = document.querySelector('.results-screen');
const loader = document.querySelector('.loader');

const nameInput = document.getElementById('name-input');
const categorySelect = document.getElementById('category');
const difficultySelect = document.getElementById('difficulty');
const startButton = document.getElementById('start-button');

const userName = document.getElementById('user-name');
const timerElement = document.getElementById('timer');
const questionText = document.getElementById('question-text');
const answerButtons = document.getElementById('answer-buttons');
const currentQuestionElement = document.getElementById('current-question');
const totalQuestionsElement = document.getElementById('total-questions');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const submitButton = document.getElementById('submit-button');

const resultName = document.getElementById('result-name');
const resultCategory = document.getElementById('result-category');
const resultDifficulty = document.getElementById('result-difficulty');
const scoreElement = document.getElementById('score');
const maxScoreElement = document.getElementById('max-score');
const correctAnswersElement = document.getElementById('correct-answers');
const incorrectAnswersElement = document.getElementById('incorrect-answers');
const restartButton = document.getElementById('restart-button');
const homeButton = document.getElementById('home-button');

// Quiz State
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];
let timer;
let timeLeft = 30;
const totalQuestions = 5;

// Event Listeners
startButton.addEventListener('click', startQuiz);
prevButton.addEventListener('click', showPreviousQuestion);
nextButton.addEventListener('click', showNextQuestion);
submitButton.addEventListener('click', submitQuiz);
restartButton.addEventListener('click', restartQuiz);
homeButton.addEventListener('click', goToHome);

// Input validation
nameInput.addEventListener('input', validateInputs);

function validateInputs() {
    startButton.disabled = !nameInput.value.trim();
}

// Helper function for fetch with timeout
function fetchWithTimeout(url, options, timeout = 10000) {
    console.log(`Attempting to fetch from ${url}`);
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
}

// Quiz Functions
async function startQuiz() {
    if (!nameInput.value.trim()) {
        nameInput.style.borderColor = 'red';
        return;
    }
    
    // Show loader
    startScreen.style.display = 'none';
    loader.style.display = 'flex';
    
    // Set user name
    userName.textContent = nameInput.value;
    
    try {
        // Fixed API URL structure - using only the required parameters
        const timestamp = new Date().getTime(); // Add timestamp to prevent caching
        let apiUrl = `https://opentdb.com/api.php?amount=${totalQuestions}&type=multiple&cachebust=${timestamp}`;
        
        // Only add category and difficulty if they have valid values
        const category = categorySelect.value;
        const difficulty = difficultySelect.value;
        
        if (category && category !== "any") {
            apiUrl += `&category=${category}`;
        }
        
        if (difficulty && difficulty !== "any") {
            apiUrl += `&difficulty=${difficulty}`;
        }
        
        console.log("Fetching from:", apiUrl); // Debug log
        
        const response = await fetchWithTimeout(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }, 15000); // Extended timeout to 15 seconds
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data); // Debug log
        
        if (data.response_code === 0 && data.results && data.results.length > 0) {
            // Extract the function to process API response
            processApiResponse(data);
        } else {
            console.error("API Error or Empty Results. Code:", data.response_code);
            throw new Error(`API returned error code: ${data.response_code} or empty results`);
        }
    } catch (error) {
        console.error("Fetch error:", error);
        
        // Try one more time with a simpler API call
        try {
            console.log("Attempting simplified API call...");
            const timestamp = new Date().getTime();
            // Simplified API URL without any filters for maximum compatibility
            const simplifiedApiUrl = `https://opentdb.com/api.php?amount=${totalQuestions}&cachebust=${timestamp}`;
            
            console.log("Retry fetching from:", simplifiedApiUrl);
            
            const secondResponse = await fetch(simplifiedApiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (secondResponse.ok) {
                const data = await secondResponse.json();
                console.log("Second API attempt response:", data);
                
                if (data.response_code === 0 && data.results && data.results.length > 0) {
                    // Process data same as primary path
                    processApiResponse(data);
                    return; // Exit function early if successful
                }
            }
            throw new Error("Backup API call also failed");
        } catch (secondError) {
            console.error("Secondary fetch error:", secondError);
            useFallbackQuestions();
        }
    }
}

// Function to use fallback questions when API fails
function useFallbackQuestions() {
    console.log("Using fallback questions");
    // Alert user
    alert('Using offline questions due to API connection issue. Please check your internet connection and try again.');
    
    // Use fallback questions
    questions = fallbackQuestions.map(question => {
        const answers = [...question.incorrect_answers, question.correct_answer];
        // Shuffle answers
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }
        
        return {
            question: question.question,
            answers: answers,
            correctAnswer: question.correct_answer
        };
    });
    
    // Initialize user answers array
    userAnswers = Array(questions.length).fill(null);
    
    // Update total questions display
    totalQuestionsElement.textContent = questions.length;
    
    // Hide loader and show quiz
    loader.style.display = 'none';
    quizScreen.style.display = 'block';
    
    // Show first question
    showQuestion(0);
    startTimer();
}

function showQuestion(index) {
    const question = questions[index];
    
    // Update current question number
    currentQuestionIndex = index;
    currentQuestionElement.textContent = index + 1;
    
    // Clear previous question
    questionText.innerHTML = '';
    answerButtons.innerHTML = '';
    
    // Set question text (decode HTML entities)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = question.question;
    questionText.textContent = tempDiv.textContent;
    
    // Create answer buttons
    question.answers.forEach((answer, i) => {
        const button = document.createElement('button');
        button.classList.add('answer-btn');
        
        // Decode HTML entities in answers
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = answer;
        button.textContent = tempDiv.textContent;
        
        button.dataset.answer = answer;
        button.addEventListener('click', selectAnswer);
        
        // If this question has been answered before, show the selection
        if (userAnswers[index] === answer) {
            button.classList.add('selected');
        }
        
        answerButtons.appendChild(button);
    });
    
    // Update navigation buttons
    prevButton.disabled = index === 0;
    nextButton.style.display = index === questions.length - 1 ? 'none' : 'block';
    submitButton.style.display = index === questions.length - 1 ? 'block' : 'none';
    
    // Reset timer
    clearInterval(timer);
    timeLeft = 30;
    timerElement.textContent = timeLeft;
    timerElement.style.color = 'black'; // Reset timer color
    startTimer();
}

function selectAnswer(e) {
    clearInterval(timer);
    
    // Remove selected class from all buttons
    const buttons = answerButtons.querySelectorAll('.answer-btn');
    buttons.forEach(button => {
        button.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    const selectedButton = e.target;
    selectedButton.classList.add('selected');
    
    // Save user's answer
    userAnswers[currentQuestionIndex] = selectedButton.dataset.answer;
}

function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

function showNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    }
}

function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            timerElement.style.color = 'red';
        } else {
            timerElement.style.color = 'black';
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Auto-move to next question or submit if on last question
            if (currentQuestionIndex < questions.length - 1) {
                showNextQuestion();
            } else {
                submitQuiz();
            }
        }
    }, 1000);
}

function submitQuiz() {
    clearInterval(timer);
    
    // Calculate score
    score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    
    questions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
            score++;
            correctCount++;
        } else if (userAnswers[index] !== null) {
            incorrectCount++;
        }
    });
    
    // Show results
    quizScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
    
    // Update results screen
    resultName.textContent = nameInput.value;
    resultCategory.textContent = categorySelect.options[categorySelect.selectedIndex].text;
    resultDifficulty.textContent = difficultySelect.value.charAt(0).toUpperCase() + difficultySelect.value.slice(1);
    
    scoreElement.textContent = score;
    maxScoreElement.textContent = questions.length;
    correctAnswersElement.textContent = correctCount;
    incorrectAnswersElement.textContent = incorrectCount;
}

function restartQuiz() {
    // Reset quiz state
    questions = [];
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    
    // Go back to start screen
    resultsScreen.style.display = 'none';
    startQuiz();
}

function goToHome() {
    // Reset quiz state
    questions = [];
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    
    // Clear input fields
    nameInput.value = '';
    
    // Show start screen
    resultsScreen.style.display = 'none';
    quizScreen.style.display = 'none';
    loader.style.display = 'none';
    startScreen.style.display = 'block';
    
    // Disable start button until name is entered
    startButton.disabled = true;
}

// Function to process API response
function processApiResponse(data) {
    // Check if data exists and has results
    if (!data || !data.results || data.results.length === 0) {
        console.error("Invalid API response format");
        useFallbackQuestions();
        return;
    }

    try {
        questions = data.results.map(question => {
            // Make sure we have valid data for each question
            if (!question.question || !question.correct_answer || !Array.isArray(question.incorrect_answers)) {
                throw new Error("Invalid question format in API response");
            }

            const answers = [...question.incorrect_answers, question.correct_answer];
            // Shuffle answers
            for (let i = answers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [answers[i], answers[j]] = [answers[j], answers[i]];
            }
            
            return {
                question: question.question,
                answers: answers,
                correctAnswer: question.correct_answer
            };
        });
        
        // Initialize user answers array
        userAnswers = Array(questions.length).fill(null);
        
        // Update total questions display
        totalQuestionsElement.textContent = questions.length;
        
        // Hide loader and show quiz
        loader.style.display = 'none';
        quizScreen.style.display = 'block';
        
        // Show first question
        showQuestion(0);
        startTimer();
    } catch (error) {
        console.error("Error processing API response:", error);
        useFallbackQuestions();
    }
}

// Initialize
validateInputs();

// Add console log to check if script loaded properly
console.log("Quiz application initialized successfully!");