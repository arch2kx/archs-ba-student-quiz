let students = [];
let quizSettings = {};
let currentQuestionIndex = 0;
let score = 0;
let quizQuestions = [];
let userAnswers = [];
let timerInterval = null;
let timeRemaining = 0;

// DOM elements
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const startBtn = document.getElementById('start-btn');
const loadingDiv = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');

// Event listeners for buttons
startBtn.addEventListener('click', startQuiz);
restartBtn.addEventListener('click', resetQuiz);
themeToggle.addEventListener('click', toggleTheme);

// Timer settings toggle
const timerEnabledCheckbox = document.getElementById('timer-enabled');
const timerSettings = document.getElementById('timer-settings');
timerEnabledCheckbox.addEventListener('change', e => {
    timerSettings.style.display = e.target.checked ? 'block' : 'none';
});

// Timer presets handling
const timerPresets = document.querySelectorAll('input[name="timer-preset"]');
const timerCustomInput = document.getElementById('timer-custom');
timerPresets.forEach(radio => {
    radio.addEventListener('change', e => {
        timerCustomInput.disabled = e.target.value !== 'custom';
        if (e.target.value === 'custom') timerCustomInput.focus();
    });
});
timerCustomInput.addEventListener('input', e => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) timeRemaining = val;
});

// Update quiz logo based on theme
function updateLogo() {
    const logo = document.getElementById('logo');
    logo.src = document.body.classList.contains('dark-mode')
        ? 'images/ba_student_quiz_logo_dark.png'
        : 'images/ba_student_quiz_logo.png';
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    if (document.body.classList.contains('dark-mode')) {
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
    updateLogo();
}

// Load saved theme on page load
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    } else {
        themeIcon.textContent = '🌙';
    }
}

// Fetch student data from GitHub
async function fetchStudentData() {
    try {
        loadingDiv.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        const response = await fetch('https://raw.githubusercontent.com/SchaleDB/SchaleDB/main/data/en/students.json');
        if (!response.ok) throw new Error('Failed to fetch student data');
        const data = await response.json();
        let studentsArray = Array.isArray(data) ? data : Object.values(data);
        
        console.log('Sample student:', studentsArray[0]);
        console.log('All keys:', Object.keys(studentsArray[0]));

        // Filter students with valid age AND academy
        students = studentsArray.filter(student => {
            const age = student.Age || student.age || student.CharacterAge;
            const hasAge = age && age !== 'Unknown' && age !== '?' && !isNaN(parseInt(age));
            const hasAcademy = student.School && student.School !== 'Unknown';
            return hasAge && hasAcademy;
        });

        if (students.length === 0) throw new Error('No valid student data found');
        loadingDiv.classList.add('hidden');
        return true;
    } catch (error) {
        console.error(error);
        loadingDiv.classList.add('hidden');
        errorMessage.textContent = `Error loading student data: ${error.message}. Please try again.`;
        errorMessage.classList.remove('hidden');
        return false;
    }
}

// Start the quiz
async function startQuiz() {
    // Determine timer duration
    const selectedPreset = document.querySelector('input[name="timer-preset"]:checked');
    let timerDuration = 10;
    if (selectedPreset) {
        if (selectedPreset.value === 'custom') {
            const val = parseInt(timerCustomInput.value);
            if (!isNaN(val) && val > 0) timerDuration = val;
        } else {
            const val = parseInt(selectedPreset.value);
            if (!isNaN(val)) timerDuration = val;
        }
    }

    // Collect quiz settings
    quizSettings = {
        quizType: document.getElementById('quiz-type').value,
        numQuestions: parseInt(document.getElementById('num-questions').value) || 5,
        answerType: document.getElementById('answer-type').value,
        studentOrder: document.getElementById('student-order').value,
        timerEnabled: document.getElementById('timer-enabled').checked,
        timerDuration
    };
    
    console.log('Quiz Settings:', quizSettings);

    // Fetch students if not loaded
    if (students.length === 0) {
        const success = await fetchStudentData();
        if (!success) return;
    }

    prepareQuizQuestions();
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    setupScreen.classList.remove('active');
    quizScreen.classList.add('active');
    displayQuestion();
}

// Prepare quiz questions
function prepareQuizQuestions() {
    let selectedStudents = [...students];

    // Shuffle or reverse based on order preference
    if (quizSettings.studentOrder === 'popular') selectedStudents = shuffleArray(selectedStudents);
    else if (quizSettings.studentOrder === 'unpopular') selectedStudents = shuffleArray(selectedStudents).reverse();
    else selectedStudents = shuffleArray(selectedStudents);

    let selected = selectedStudents.slice(0, Math.min(quizSettings.numQuestions, selectedStudents.length));

    // Assign question type per student
    quizQuestions = selected.map(student => {
        let questionType = quizSettings.quizType;
        if (quizSettings.quizType === 'mixed') {
            questionType = ['age', 'name', 'academy'][Math.floor(Math.random() * 3)];
        }
        console.log(`Student: ${student.Name}, Question Type: ${questionType}`);
        return { ...student, questionType };
    });
    
    console.log('Quiz Questions prepared:', quizQuestions);
}

// Display current question
function displayQuestion() {
    const question = quizQuestions[currentQuestionIndex];

    // Update progress display
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = quizQuestions.length;
    document.getElementById('current-score').textContent = score;

    // Student info
    const studentImage = document.getElementById('student-image');
    const studentName = document.getElementById('student-name');
    const questionText = document.querySelector('.question h3');
    studentImage.src = `https://schaledb.com/images/student/collection/${question.Id}.webp`;
    studentImage.alt = question.Name;

    // Show question based on type
    if (question.questionType === 'name') {
        studentName.style.display = 'none';
        questionText.textContent = 'What is this student\'s name?';
    } else if (question.questionType === 'academy') {
        studentName.style.display = 'block';
        studentName.textContent = question.Name;
        questionText.textContent = 'Which academy does this student attend?';
    } else {
        studentName.style.display = 'block';
        studentName.textContent = question.Name;
        questionText.textContent = 'How old is this student?';
    }

    document.getElementById('feedback').classList.add('hidden');

    // Render answer options
    const answerContainer = document.getElementById('answer-container');
    answerContainer.innerHTML = '';
    
    if (question.questionType === 'age') {
        if (quizSettings.answerType === 'multiple-choice') {
            answerContainer.className = 'answer-container multiple-choice';
            displayMultipleChoiceAge(question);
        } else {
            answerContainer.className = 'answer-container type-in';
            displayTypeInAge(question);
        }
    } else if (question.questionType === 'name') {
        if (quizSettings.answerType === 'multiple-choice') {
            answerContainer.className = 'answer-container multiple-choice';
            displayMultipleChoiceName(question);
        } else {
            answerContainer.className = 'answer-container type-in';
            displayTypeInName(question);
        }
    } else if (question.questionType === 'academy') {
        if (quizSettings.answerType === 'multiple-choice') {
            answerContainer.className = 'answer-container multiple-choice';
            displayMultipleChoiceAcademy(question);
        } else {
            answerContainer.className = 'answer-container type-in';
            displayTypeInAcademy(question);
        }
    }

    if (quizSettings.timerEnabled) startTimer();
    else document.getElementById('timer-display').classList.add('hidden');
}

// Display multiple choice for age
function displayMultipleChoiceAge(question) {
    const correctAge = getStudentAge(question);
    const answerContainer = document.getElementById('answer-container');
    const options = new Set([correctAge]);

    // Add random options
    while (options.size < 4) {
        const rand = correctAge + Math.floor(Math.random() * 7) - 3;
        if (rand > 0 && rand <= 25) options.add(rand);
    }

    shuffleArray([...options]).forEach(age => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = `${age} years old`;
        btn.dataset.answer = age;
        btn.addEventListener('click', () => checkAnswer(age, correctAge, btn, 'age'));
        answerContainer.appendChild(btn);
    });
}

// Display multiple choice for name
function displayMultipleChoiceName(question) {
    const correctName = question.Name;
    const answerContainer = document.getElementById('answer-container');
    const options = new Set([correctName]);
    const shuffled = shuffleArray(students.filter(s => s.Name !== correctName));
    for (let i = 0; i < 3 && i < shuffled.length; i++) options.add(shuffled[i].Name);

    shuffleArray([...options]).forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = name;
        btn.dataset.answer = name;
        btn.addEventListener('click', () => checkAnswer(name, correctName, btn, 'name'));
        answerContainer.appendChild(btn);
    });
}

// Display multiple choice for academy
function displayMultipleChoiceAcademy(question) {
    // Debug: Check available school fields
    console.log('Student data:', question);
    console.log('School field:', question.School);
    
    const correctAcademy = question.School || 'Unknown';
    console.log('Correct academy:', correctAcademy);
    
    const answerContainer = document.getElementById('answer-container');
    
    // Blue Archive academies
    const academies = ['Gehenna', 'Trinity', 'Millennium', 'Abydos', 'Shanhaijing', 'Hyakkiyako', 'Red Winter', 'Valkyrie', 'Arius', 'SRT'];
    
    // Generate options (correct academy + 3 random academies)
    const options = new Set([correctAcademy]);
    const shuffledAcademies = shuffleArray(academies.filter(a => a !== correctAcademy));
    
    for (let i = 0; i < 3 && i < shuffledAcademies.length; i++) {
        options.add(shuffledAcademies[i]);
    }
    
    const optionsArray = shuffleArray([...options]);
    
    optionsArray.forEach(academy => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.textContent = academy;
        button.dataset.answer = academy;
        button.addEventListener('click', () => checkAnswer(academy, correctAcademy, button, 'academy'));
        answerContainer.appendChild(button);
    });
}

// Display type-in input for age
function displayTypeInAge(question) {
    const container = document.getElementById('answer-container');
    const group = document.createElement('div');
    group.className = 'type-in-group';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'type-in-input';
    input.placeholder = 'Enter age';
    input.min = 1;
    input.max = 25;
    input.id = 'age-input';
    const submit = document.createElement('button');
    submit.className = 'submit-answer-btn';
    submit.textContent = 'Submit';
    submit.addEventListener('click', () => {
        const val = parseInt(input.value);
        if (!isNaN(val)) checkAnswer(val, getStudentAge(question), submit, 'age');
    });
    input.addEventListener('keypress', e => { if (e.key === 'Enter') submit.click(); });
    group.append(input, submit);
    container.appendChild(group);
    input.focus();
}

// Display type-in input for name
function displayTypeInName(question) {
    const container = document.getElementById('answer-container');
    const group = document.createElement('div');
    group.className = 'type-in-group';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'type-in-input';
    input.placeholder = 'Enter student name';
    input.id = 'name-input';
    const submit = document.createElement('button');
    submit.className = 'submit-answer-btn';
    submit.textContent = 'Submit';
    submit.addEventListener('click', () => {
        const val = input.value.trim();
        if (val) checkAnswer(val, question.Name, submit, 'name');
    });
    input.addEventListener('keypress', e => { if (e.key === 'Enter') submit.click(); });
    group.append(input, submit);
    container.appendChild(group);
    input.focus();
}

// Display type-in input for academy
function displayTypeInAcademy(question) {
    const answerContainer = document.getElementById('answer-container');
    
    const group = document.createElement('div');
    group.className = 'type-in-group';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'type-in-input';
    input.placeholder = 'Enter academy name';
    input.id = 'academy-input';
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'submit-answer-btn';
    submitBtn.textContent = 'Submit';
    submitBtn.addEventListener('click', () => {
        const userAcademy = input.value.trim();
        if (userAcademy) {
            const correctAcademy = question.School || 'Unknown';
            checkAnswer(userAcademy, correctAcademy, submitBtn, 'academy');
        }
    });
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    });
    
    group.appendChild(input);
    group.appendChild(submitBtn);
    answerContainer.appendChild(group);
    
    input.focus();
}

// Check the user's answer
function checkAnswer(userAnswer, correctAnswer, element, type) {
    stopTimer();
    
    let isCorrect;
    if (type === 'age') {
        isCorrect = userAnswer === correctAnswer;
    } else {
        // Case-insensitive comparison for names and academies
        isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    }

    userAnswers.push({ 
        student: quizQuestions[currentQuestionIndex], 
        userAnswer, 
        correctAnswer, 
        isCorrect, 
        questionType: type 
    });
    
    if (isCorrect) score++;
    document.getElementById('current-score').textContent = score;

    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    const studentName = quizQuestions[currentQuestionIndex].Name;
    
    if (isCorrect) {
        feedback.className = 'feedback correct';
        if (type === 'age') {
            feedbackText.innerHTML = `<strong>✅ Correct!</strong><br>${studentName} is ${correctAnswer} years old.`;
        } else if (type === 'academy') {
            feedbackText.innerHTML = `<strong>✅ Correct!</strong><br>${studentName} attends ${correctAnswer}.`;
        } else {
            feedbackText.innerHTML = `<strong>✅ Correct!</strong><br>This student is ${correctAnswer}.`;
        }
    } else {
        feedback.className = 'feedback incorrect';
        if (type === 'age') {
            feedbackText.innerHTML = `<strong>❌ Incorrect!</strong><br>You guessed ${userAnswer}, but ${studentName} is ${correctAnswer} years old.`;
        } else if (type === 'academy') {
            feedbackText.innerHTML = `<strong>❌ Incorrect!</strong><br>You guessed ${userAnswer}, but ${studentName} attends ${correctAnswer}.`;
        } else {
            feedbackText.innerHTML = `<strong>❌ Incorrect!</strong><br>You guessed ${userAnswer}, but this student is ${correctAnswer}.`;
        }
    }

    feedback.classList.remove('hidden');

    // Disable all answer buttons and inputs
    document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
    
    let inputFieldId;
    if (type === 'age') inputFieldId = 'age-input';
    else if (type === 'name') inputFieldId = 'name-input';
    else if (type === 'academy') inputFieldId = 'academy-input';
    const inputField = document.getElementById(inputFieldId);
    if (inputField) inputField.disabled = true;
    
    document.querySelectorAll('.submit-answer-btn').forEach(btn => btn.disabled = true);

    document.getElementById('next-btn').onclick = nextQuestion;
}

// Move to next question
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length) displayQuestion();
    else showResults();
}

// Show final results
function showResults() {
    quizScreen.classList.remove('active');
    resultsScreen.classList.add('active');
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-total').textContent = quizQuestions.length;
    document.getElementById('percentage').textContent = Math.round((score / quizQuestions.length) * 100);

    const resultsDetails = document.getElementById('results-details');
    resultsDetails.innerHTML = '';

    userAnswers.forEach(a => {
        let questionTypeLabel;
        if (a.questionType === 'age') questionTypeLabel = 'Age';
        else if (a.questionType === 'name') questionTypeLabel = 'Name';
        else if (a.questionType === 'academy') questionTypeLabel = 'Academy';
        
        const item = document.createElement('div');
        item.className = `result-item ${a.isCorrect ? 'correct-answer' : 'incorrect-answer'}`;
        item.innerHTML = `
            <img src="https://schaledb.com/images/student/collection/${a.student.Id}.webp" alt="${a.student.Name}">
            <div class="result-info">
                <strong>${a.student.Name}</strong>
                <span>${questionTypeLabel} - Your answer: ${a.userAnswer} | Correct: ${a.correctAnswer}</span>
            </div>
            <div class="result-status">${a.isCorrect ? '✅' : '❌'}</div>
        `;
        resultsDetails.appendChild(item);
    });
}

// Reset quiz to setup
function resetQuiz() {
    resultsScreen.classList.remove('active');
    setupScreen.classList.add('active');
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    quizQuestions = [];
    stopTimer();
    document.getElementById('timer-display').classList.add('hidden');
}

// Shuffle utility
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Get student age safely
function getStudentAge(student) {
    return parseInt(student.Age || student.age || student.CharacterAge);
}

// Start countdown timer
function startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    const timerValue = document.getElementById('timer-value');
    timeRemaining = quizSettings.timerDuration || 10;
    timerValue.textContent = timeRemaining;
    timerDisplay.className = 'timer-display';
    timerDisplay.classList.remove('hidden');
    stopTimer();

    timerInterval = setInterval(() => {
        timeRemaining--;
        timerValue.textContent = timeRemaining;
        if (timeRemaining <= 5) timerDisplay.className = 'timer-display danger';
        else if (timeRemaining <= 10) timerDisplay.className = 'timer-display warning';
        if (timeRemaining <= 0) {
            stopTimer();
            handleTimeout();
        }
    }, 1000);
}

// Stop the timer
function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

// Handle time running out
function handleTimeout() {
    const question = quizQuestions[currentQuestionIndex];
    let correctAnswer;
    
    if (question.questionType === 'age') {
        correctAnswer = getStudentAge(question);
    } else if (question.questionType === 'name') {
        correctAnswer = question.Name;
    } else if (question.questionType === 'academy') {
        correctAnswer = question.School || 'Unknown';
    }

    userAnswers.push({ 
        student: question, 
        userAnswer: 'Time expired', 
        correctAnswer, 
        isCorrect: false, 
        questionType: question.questionType 
    });

    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    feedback.className = 'feedback incorrect';
    feedbackText.innerHTML = `<strong>⏱️ Time's Up!</strong><br>The correct answer was: ${correctAnswer}`;
    feedback.classList.remove('hidden');

    document.querySelectorAll('.answer-btn, .type-in-input, .submit-answer-btn').forEach(el => el.disabled = true);
    document.getElementById('next-btn').onclick = nextQuestion;
}

function openShareModal() {
    const finalScore = score;
    const totalQuestions = quizQuestions.length;
    const percentage = Math.round((finalScore / totalQuestions) * 100);
    
    let quizTypeText = '';
    switch(quizSettings.quizType) {
        case 'age': quizTypeText = 'Age'; break;
        case 'name': quizTypeText = 'Name'; break;
        case 'academy': quizTypeText = 'Academy'; break;
        case 'mixed': quizTypeText = 'Mixed'; break;
    }
    
    const shareMessage = `I scored ${finalScore}/${totalQuestions} (${percentage}%) on the Blue Archive ${quizTypeText} Quiz! 🎯\n\nThink you can beat my score? Try it yourself!`;
    
    shareText.textContent = shareMessage;
    shareModal.classList.add('active');
}

function closeShareModal() {
    shareModal.classList.remove('active');
}

// Share buttons
document.getElementById('share-twitter').addEventListener('click', () => {
    const text = encodeURIComponent(shareText.textContent);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
});

document.getElementById('share-facebook').addEventListener('click', () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
});

document.getElementById('share-reddit').addEventListener('click', () => {
    const text = encodeURIComponent(shareText.textContent);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.reddit.com/submit?title=${text}&url=${url}`, '_blank');
});

document.getElementById('share-copy').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(shareText.textContent);
        const btn = document.getElementById('share-copy');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    } catch (err) {
        alert('Failed to copy. Please copy manually.');
    }
});

// Initialize on load
window.addEventListener('load', () => {
    loadTheme();
    updateLogo();
});
