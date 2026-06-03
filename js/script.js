const TACTIC_ROLES = ['DamageDealer', 'Healer', 'Supporter', 'Tanker', 'Vehicle'];
const BULLET_TYPES = ['Explosion', 'Mystic', 'Pierce', 'Sonic'];
const ARMOR_TYPES = ['ElasticArmor', 'HeavyArmor', 'LightArmor', 'Unarmed'];
const WEAPON_TYPES = ['AR', 'FT', 'GL', 'HG', 'MG', 'MT', 'RG', 'RL', 'SG', 'SMG', 'SR'];
const ALL_TYPES = [
    'age', 'name', 'academy', 'birthday', 'height', 'voice',
    'role', 'damageType', 'armorType', 'weapon',
];
const QUESTION_LABELS = {
    age: 'Age', name: 'Name', academy: 'Academy',
    birthday: 'Birthday', height: 'Height', voice: 'Voice',
    role: 'Role', damageType: 'Damage Type', armorType: 'Armor Type', weapon: 'Weapon',
};
const QUESTION_TEXTS = {
    age: 'How old is this student?',
    name: "What is this student's name?",
    academy: 'Which academy does this student attend?',
    birthday: "When is this student's birthday?",
    height: 'How tall is this student?',
    voice: 'Who voices this student?',
    role: "What is this student's role?",
    damageType: 'What damage type does this student deal?',
    armorType: 'What armor type does this student have?',
    weapon: 'What weapon does this student use?',
};
let students = [];
let quizSettings = {};
let currentQuestionIndex = 0;
let score = 0;
let quizQuestions = [];
let userAnswers = [];
let timerInterval = null;
let timeRemaining = 0;
// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = a[i];
        a[i] = a[j];
        a[j] = temp;
    }
    return a;
}
function getStudentAge(student) {
    return parseInt(student.Age || student.age || student.CharacterAge || '0');
}
function splitCamelCase(s) {
    return s.replace(/([A-Z])/g, ' $1').trim();
}
function stripOrdinal(s) {
    return s.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
}
function getCorrectAnswer(student, type) {
    switch (type) {
        case 'age': return getStudentAge(student);
        case 'name': return student.Name;
        case 'academy': return (student.School ?? 'Unknown').replace('RedWinter', 'Red Winter');
        case 'birthday': return stripOrdinal(student.Birthday ?? '');
        case 'height': return student.CharHeightMetric ?? '';
        case 'voice': return student.CharacterVoice ?? '';
        case 'role': return splitCamelCase(student.TacticRole ?? '');
        case 'damageType': return student.BulletType ?? '';
        case 'armorType': return splitCamelCase(student.ArmorType ?? '');
        case 'weapon': return student.WeaponType ?? '';
    }
}
function getDistractors(correct, type) {
    switch (type) {
        case 'age': {
            const age = correct;
            const opts = new Set();
            while (opts.size < 3) {
                const rand = age + Math.floor(Math.random() * 7) - 3;
                if (rand > 0 && rand <= 25 && rand !== age)
                    opts.add(rand);
            }
            return [...opts];
        }
        case 'name':
            return shuffleArray(students.filter(s => s.Name !== correct))
                .slice(0, 3).map(s => s.Name);
        case 'academy': {
            const academies = ['Gehenna', 'Trinity', 'Millennium', 'Abydos', 'Shanhaijing',
                'Hyakkiyako', 'Red Winter', 'Valkyrie', 'Arius', 'SRT'];
            return shuffleArray(academies.filter(a => a !== correct)).slice(0, 3);
        }
        case 'birthday':
            return shuffleArray(students
                .map(s => stripOrdinal(s.Birthday ?? ''))
                .filter((v, i, arr) => v && v !== correct && arr.indexOf(v) === i)).slice(0, 3);
        case 'height': {
            const h = parseInt(String(correct));
            const offsets = shuffleArray([-15, -10, -5, 5, 10, 15, -20, 20]);
            const opts = [];
            for (const off of offsets) {
                if (opts.length >= 3)
                    break;
                const v = h + off;
                if (v > 100 && v < 220)
                    opts.push(`${v}cm`);
            }
            return opts;
        }
        case 'voice':
            return shuffleArray(students
                .map(s => s.CharacterVoice ?? '')
                .filter((v, i, arr) => v && v !== correct && arr.indexOf(v) === i)).slice(0, 3);
        case 'role':
            return shuffleArray(TACTIC_ROLES.map(splitCamelCase).filter(r => r !== correct)).slice(0, 3);
        case 'damageType':
            return shuffleArray(BULLET_TYPES.filter(b => b !== correct)).slice(0, 3);
        case 'armorType':
            return shuffleArray(ARMOR_TYPES.map(splitCamelCase).filter(a => a !== correct)).slice(0, 3);
        case 'weapon':
            return shuffleArray(WEAPON_TYPES.filter(w => w !== correct)).slice(0, 3);
    }
}
function studentHasField(student, type) {
    switch (type) {
        case 'age': return !isNaN(getStudentAge(student));
        case 'name': return !!student.Name;
        case 'academy': return !!student.School && student.School !== 'Unknown';
        case 'birthday': return !!student.Birthday;
        case 'height': return !!student.CharHeightMetric;
        case 'voice': return !!student.CharacterVoice;
        case 'role': return !!student.TacticRole;
        case 'damageType': return !!student.BulletType;
        case 'armorType': return !!student.ArmorType;
        case 'weapon': return !!student.WeaponType;
    }
}
function answersMatch(user, correct, type) {
    if (type === 'age')
        return Number(user) === Number(correct);
    if (type === 'height') {
        const nh = (s) => s.toLowerCase().replace(/\s+/g, '').replace('cm', '');
        return nh(String(user)) === nh(String(correct));
    }
    if (type === 'birthday') {
        const nb = (s) => s.toLowerCase().replace(/\s+/g, '').replace(/(st|nd|rd|th)/g, '');
        return nb(String(user)) === nb(String(correct));
    }
    const norm = (s) => s.toLowerCase().trim().replace(/\s+/g, '');
    return norm(String(user)) === norm(String(correct));
}
function getAnswerDetail(isCorrect, name, user, correct, type) {
    if (isCorrect) {
        switch (type) {
            case 'age': return `${name} is ${correct} years old.`;
            case 'name': return `This student is ${correct}.`;
            case 'academy': return `${name} attends ${correct}.`;
            case 'birthday': return `${name}'s birthday is ${correct}.`;
            case 'height': return `${name} is ${correct} tall.`;
            case 'voice': return `${name} is voiced by ${correct}.`;
            case 'role': return `${name}'s role is ${correct}.`;
            case 'damageType': return `${name} deals ${correct} damage.`;
            case 'armorType': return `${name} has ${correct}.`;
            case 'weapon': return `${name} uses a ${correct}.`;
        }
    }
    switch (type) {
        case 'age': return `You guessed ${user}, but ${name} is ${correct} years old.`;
        case 'name': return `You guessed ${user}, but this student is ${correct}.`;
        case 'academy': return `You guessed ${user}, but ${name} attends ${correct}.`;
        default: return `You guessed ${user}, but the correct answer is ${correct}.`;
    }
}
// ── Theme ─────────────────────────────────────────────────────────────────────
function updateLogo() {
    const logo = document.getElementById('logo');
    if (!logo)
        return;
    const isDark = document.documentElement.classList.contains('dark-mode');
    logo.src = isDark ? 'images/ba_student_quiz_logo_dark.png' : 'images/ba_student_quiz_logo.png';
}
function toggleTheme() {
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const isDark = root.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeIcon.src = isDark ? 'images/sun.webp' : 'images/crescent-moon.webp';
    updateLogo();
}
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const root = document.documentElement;
    if (savedTheme === 'dark')
        root.classList.add('dark-mode');
    else
        root.classList.remove('dark-mode');
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const themeIcon = themeToggle.querySelector('.theme-icon');
        themeIcon.src = savedTheme === 'dark' ? 'images/sun.webp' : 'images/crescent-moon.webp';
    }
    window.addEventListener('load', () => document.body.classList.add('theme-ready'));
    updateLogo();
}
// ── Data ──────────────────────────────────────────────────────────────────────
async function fetchStudentData() {
    const loadingDiv = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    try {
        loadingDiv.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        const response = await fetch('https://raw.githubusercontent.com/SchaleDB/SchaleDB/main/data/en/students.json');
        if (!response.ok)
            throw new Error('Failed to fetch student data');
        const data = await response.json();
        const studentsArray = Array.isArray(data)
            ? data
            : Object.values(data);
        students = studentsArray.filter(s => {
            const age = s.Age || s.age || s.CharacterAge;
            const hasAge = age && age !== 'Unknown' && age !== '?' && !isNaN(parseInt(age));
            const hasAcademy = s.School && s.School !== 'Unknown';
            return hasAge && hasAcademy;
        });
        if (students.length === 0)
            throw new Error('No valid student data found');
        loadingDiv.classList.add('hidden');
        return true;
    }
    catch (error) {
        console.error(error);
        loadingDiv.classList.add('hidden');
        errorMessage.textContent = `Error loading student data: ${error.message}. Please try again.`;
        errorMessage.classList.remove('hidden');
        return false;
    }
}
// ── Quiz flow ─────────────────────────────────────────────────────────────────
async function startQuiz() {
    const timerCustomInput = document.getElementById('timer-custom');
    const setupScreen = document.getElementById('setup-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const selectedPreset = document.querySelector('input[name="timer-preset"]:checked');
    let timerDuration = 10;
    if (selectedPreset) {
        if (selectedPreset.value === 'custom') {
            const val = parseInt(timerCustomInput.value);
            if (!isNaN(val) && val > 0)
                timerDuration = val;
        }
        else {
            const val = parseInt(selectedPreset.value);
            if (!isNaN(val))
                timerDuration = val;
        }
    }
    const numQuestionsVal = document.getElementById('num-questions').value;
    let numQuestions;
    if (numQuestionsVal === 'custom') {
        const custom = parseInt(document.getElementById('custom-questions').value);
        numQuestions = isNaN(custom) ? 10 : Math.min(100, Math.max(5, custom));
    }
    else {
        numQuestions = parseInt(numQuestionsVal) || 10;
    }
    quizSettings = {
        quizType: document.getElementById('quiz-type').value,
        numQuestions,
        answerType: document.getElementById('answer-type').value,
        studentOrder: document.getElementById('student-order').value,
        timerEnabled: document.getElementById('timer-enabled').checked,
        timerDuration,
    };
    if (students.length === 0) {
        const success = await fetchStudentData();
        if (!success)
            return;
    }
    prepareQuizQuestions();
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    setupScreen.classList.remove('active');
    quizScreen.classList.add('active');
    document.getElementById('logo').classList.add('hidden');
    displayQuestion();
}
function prepareQuizQuestions() {
    let pool = [...students];
    if (quizSettings.quizType !== 'mixed') {
        pool = pool.filter(s => studentHasField(s, quizSettings.quizType));
    }
    if (quizSettings.studentOrder === 'unpopular')
        pool = shuffleArray(pool).reverse();
    else
        pool = shuffleArray(pool);
    const selected = pool.slice(0, Math.min(quizSettings.numQuestions, pool.length));
    quizQuestions = selected.map(student => {
        let questionType;
        if (quizSettings.quizType === 'mixed') {
            const available = ALL_TYPES.filter(t => studentHasField(student, t));
            questionType = available[Math.floor(Math.random() * available.length)];
        }
        else {
            questionType = quizSettings.quizType;
        }
        return { ...student, questionType };
    });
}
// ── Display ───────────────────────────────────────────────────────────────────
function displayQuestion() {
    document.getElementById('quiz-screen').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const question = quizQuestions[currentQuestionIndex];
    if (!question)
        return;
    document.getElementById('current-question').textContent = String(currentQuestionIndex + 1);
    document.getElementById('total-questions').textContent = String(quizQuestions.length);
    document.getElementById('current-score').textContent = String(score);
    const studentImage = document.getElementById('student-image');
    const studentNameEl = document.getElementById('student-name');
    const questionText = document.querySelector('.question h3');
    studentImage.src = `https://schaledb.com/images/student/portrait/${question.Id}.webp`;
    studentImage.alt = question.Name;
    if (question.questionType === 'name') {
        studentNameEl.style.display = 'none';
    }
    else {
        studentNameEl.style.display = 'block';
        studentNameEl.textContent = question.Name;
    }
    questionText.textContent = QUESTION_TEXTS[question.questionType];
    document.getElementById('feedback').classList.add('hidden');
    const answerContainer = document.getElementById('answer-container');
    answerContainer.innerHTML = '';
    const correctAnswer = getCorrectAnswer(question, question.questionType);
    if (quizSettings.answerType === 'multiple-choice') {
        answerContainer.className = 'answer-container multiple-choice';
        displayMultipleChoice(correctAnswer, question.questionType);
    }
    else {
        answerContainer.className = 'answer-container type-in';
        displayTypeIn(correctAnswer, question.questionType);
    }
    if (quizSettings.timerEnabled)
        startTimer();
    else
        document.getElementById('timer-display').classList.add('hidden');
}
function displayMultipleChoice(correctAnswer, type) {
    const distractors = getDistractors(correctAnswer, type);
    const allOptions = shuffleArray([correctAnswer, ...distractors]);
    const container = document.getElementById('answer-container');
    allOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = type === 'age' ? `${opt} years old` : String(opt);
        btn.addEventListener('click', () => checkAnswer(opt, correctAnswer, type));
        container.appendChild(btn);
    });
}
function displayTypeIn(correctAnswer, type) {
    const placeholders = {
        age: 'Enter age', name: 'Enter student name', academy: 'Enter academy name',
        birthday: 'e.g. March 12', height: 'e.g. 160cm', voice: 'Enter voice actor name',
        role: 'e.g. Damage Dealer', damageType: 'e.g. Explosion',
        armorType: 'e.g. Light Armor', weapon: 'e.g. SR',
    };
    const inputIds = {
        age: 'age-input', name: 'name-input', academy: 'academy-input',
        birthday: 'birthday-input', height: 'height-input', voice: 'voice-input',
        role: 'role-input', damageType: 'damagetype-input',
        armorType: 'armortype-input', weapon: 'weapon-input',
    };
    const container = document.getElementById('answer-container');
    const group = document.createElement('div');
    group.className = 'type-in-group';
    const input = document.createElement('input');
    input.type = type === 'age' ? 'number' : 'text';
    input.className = 'type-in-input';
    input.placeholder = placeholders[type];
    input.id = inputIds[type];
    if (type === 'age') {
        input.min = '1';
        input.max = '25';
    }
    const submit = document.createElement('button');
    submit.className = 'submit-answer-btn';
    submit.textContent = 'Submit';
    submit.addEventListener('click', () => {
        const raw = input.value.trim();
        if (!raw)
            return;
        const val = type === 'age' ? parseInt(raw) : raw;
        if (type === 'age' && isNaN(val))
            return;
        checkAnswer(val, correctAnswer, type);
    });
    input.addEventListener('keypress', e => { if (e.key === 'Enter')
        submit.click(); });
    group.append(input, submit);
    container.appendChild(group);
    input.focus();
}
// ── Answer checking ───────────────────────────────────────────────────────────
function checkAnswer(userAnswer, correctAnswer, type) {
    stopTimer();
    const isCorrect = answersMatch(userAnswer, correctAnswer, type);
    const currentQuestion = quizQuestions[currentQuestionIndex];
    userAnswers.push({ student: currentQuestion, userAnswer, correctAnswer, isCorrect, questionType: type });
    if (isCorrect)
        score++;
    document.getElementById('current-score').textContent = String(score);
    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    const studentName = currentQuestion.Name;
    const detail = getAnswerDetail(isCorrect, studentName, userAnswer, correctAnswer, type);
    if (isCorrect) {
        feedback.className = 'feedback correct';
        feedbackText.innerHTML = `<strong><img src="images/checkmark.webp" alt="Correct" class="feedback-icon"> Correct!</strong><br>${detail}`;
    }
    else {
        feedback.className = 'feedback incorrect';
        feedbackText.innerHTML = `<strong><img src="images/cross-mark.webp" alt="Incorrect" class="feedback-icon"> Incorrect!</strong><br>${detail}`;
    }
    feedback.classList.remove('hidden');
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.querySelectorAll('.answer-btn').forEach(btn => { btn.disabled = true; });
    const inputIds = {
        age: 'age-input', name: 'name-input', academy: 'academy-input',
        birthday: 'birthday-input', height: 'height-input', voice: 'voice-input',
        role: 'role-input', damageType: 'damagetype-input',
        armorType: 'armortype-input', weapon: 'weapon-input',
    };
    const inputField = document.getElementById(inputIds[type]);
    if (inputField)
        inputField.disabled = true;
    document.querySelectorAll('.submit-answer-btn').forEach(btn => { btn.disabled = true; });
    document.getElementById('next-btn').onclick = nextQuestion;
}
// ── Navigation ────────────────────────────────────────────────────────────────
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizQuestions.length)
        displayQuestion();
    else
        showResults();
}
function showResults() {
    document.getElementById('quiz-screen').classList.remove('active');
    document.getElementById('results-screen').classList.add('active');
    document.getElementById('final-score').textContent = String(score);
    document.getElementById('final-total').textContent = String(quizQuestions.length);
    document.getElementById('percentage').textContent = String(Math.round((score / quizQuestions.length) * 100));
    const resultsDetails = document.getElementById('results-details');
    resultsDetails.innerHTML = '';
    userAnswers.forEach(a => {
        const item = document.createElement('div');
        item.className = `result-item ${a.isCorrect ? 'correct-answer' : 'incorrect-answer'}`;
        item.innerHTML = `
<img src="https://schaledb.com/images/student/collection/${a.student.Id}.webp" alt="${a.student.Name}">
<div class="result-info">
    <strong>${a.student.Name}</strong>
    <span>${QUESTION_LABELS[a.questionType]} — Your answer: ${a.userAnswer} | Correct: ${a.correctAnswer}</span>
</div>
<div class="result-status">
    <img src="${a.isCorrect ? 'images/checkmark.webp' : 'images/cross-mark.webp'}"
         alt="${a.isCorrect ? 'Correct' : 'Incorrect'}" class="result-icon">
</div>`;
        resultsDetails.appendChild(item);
    });
}
function resetQuiz() {
    document.getElementById('results-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('active');
    document.getElementById('logo').classList.remove('hidden');
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    quizQuestions = [];
    stopTimer();
    document.getElementById('timer-display').classList.add('hidden');
}
// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    const timerValue = document.getElementById('timer-value');
    timeRemaining = quizSettings.timerDuration || 10;
    timerValue.textContent = String(timeRemaining);
    timerDisplay.className = 'timer-display';
    timerDisplay.classList.remove('hidden');
    stopTimer();
    timerInterval = setInterval(() => {
        timeRemaining--;
        timerValue.textContent = String(timeRemaining);
        if (timeRemaining <= 5)
            timerDisplay.className = 'timer-display danger';
        else if (timeRemaining <= 10)
            timerDisplay.className = 'timer-display warning';
        if (timeRemaining <= 0) {
            stopTimer();
            handleTimeout();
        }
    }, 1000);
}
function stopTimer() {
    if (timerInterval)
        clearInterval(timerInterval);
}
function handleTimeout() {
    const question = quizQuestions[currentQuestionIndex];
    if (!question)
        return;
    const correctAnswer = getCorrectAnswer(question, question.questionType);
    userAnswers.push({
        student: question,
        userAnswer: 'Time expired',
        correctAnswer,
        isCorrect: false,
        questionType: question.questionType,
    });
    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    feedback.className = 'feedback incorrect';
    feedbackText.innerHTML = `<strong>⏱️ Time's Up!</strong><br>The correct answer was: ${correctAnswer}`;
    feedback.classList.remove('hidden');
    document.querySelectorAll('.answer-btn, .type-in-input, .submit-answer-btn')
        .forEach(el => { el.disabled = true; });
    document.getElementById('next-btn').onclick = nextQuestion;
}
// ── Share ─────────────────────────────────────────────────────────────────────
function openShareModal() {
    const shareText = document.getElementById('share-text');
    const shareModal = document.getElementById('share-modal');
    if (!shareText || !shareModal)
        return;
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const label = QUESTION_LABELS[quizSettings.quizType] ?? quizSettings.quizType;
    shareText.textContent =
        `I scored ${score}/${quizQuestions.length} (${percentage}%) on the Blue Archive ${label} Quiz! 🎯\n\nThink you can beat my score? Try it yourself!`;
    shareModal.classList.add('active');
}
function closeShareModal() {
    document.getElementById('share-modal')?.classList.remove('active');
}
// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const timerCheckbox = document.getElementById('timer-enabled');
    const timerSettings = document.getElementById('timer-settings');
    const timerCustom = document.getElementById('timer-custom');
    const timerPresets = document.querySelectorAll('input[name="timer-preset"]');
    startBtn?.addEventListener('click', startQuiz);
    restartBtn?.addEventListener('click', resetQuiz);
    if (themeToggle)
        themeToggle.addEventListener('click', toggleTheme);
    else
        console.error('Theme toggle button not found!');
    if (timerCheckbox && timerSettings) {
        timerCheckbox.addEventListener('change', e => {
            timerSettings.style.display = e.target.checked ? 'block' : 'none';
        });
    }
    timerPresets.forEach(radio => {
        radio.addEventListener('change', e => {
            const val = e.target.value;
            if (timerCustom) {
                timerCustom.disabled = val !== 'custom';
                if (val === 'custom')
                    timerCustom.focus();
            }
        });
    });
    timerCustom?.addEventListener('change', e => {
        const target = e.target;
        let val = parseInt(target.value);
        if (isNaN(val) || val < 5)
            val = 5;
        if (val > 60)
            val = 60;
        target.value = String(val);
    });
    const numQSelect = document.getElementById('num-questions');
    const customWrapper = document.getElementById('custom-questions-wrapper');
    const customInput = document.getElementById('custom-questions');
    numQSelect?.addEventListener('change', e => {
        const isCustom = e.target.value === 'custom';
        if (customWrapper)
            customWrapper.style.display = isCustom ? 'flex' : 'none';
        if (isCustom)
            customInput?.focus();
    });
    customInput?.addEventListener('change', e => {
        const target = e.target;
        let val = parseInt(target.value);
        if (isNaN(val) || val < 5)
            val = 5;
        if (val > 100)
            val = 100;
        target.value = String(val);
    });
    loadTheme();
    document.querySelector('.x-share-button')?.addEventListener('click', () => {
        const quizLink = window.location.href.split('?')[0];
        const msg = `I got ${score}/${quizQuestions.length} in BA Student Quiz! Try playing at ${quizLink}`;
        const a = document.createElement('a');
        a.href = `https://x.com/intent/tweet?text=${encodeURIComponent(msg)}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
    });
});
document.addEventListener('DOMContentLoaded', loadTheme);
export {};
//# sourceMappingURL=script.js.map