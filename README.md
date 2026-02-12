<img src="images/ba_student_quiz_logo_light_readme.png" alt="Blue Archive Student Quiz" width="425px">

A web-based quiz game that tests your knowledge of Blue Archive students using data from SchaleDB.

## Features

- Multiple quiz settings for customized gameplay
- Two answer modes: Multiple Choice or Type-In
- Student selection options: Random, Popular First, or Least Popular First
- Adjustable question count (5, 10, 15, 20, or 30 questions)
- Dark mode and light mode toggle
- Immediate feedback on answers
- Detailed results screen with score breakdown
- Responsive design for mobile and desktop

## How to Use

Locally:
1. Open `index.html` in your web browser
2. Configure your quiz settings:
   - Choose the number of questions
   - Select your preferred answer type
   - Pick student selection order
3. Click "Start Quiz" to begin
4. Answer each question about student names, ages, or both
5. View your final score and results

Online Version:
https://arch2kx.github.io/archs-ba-student-quiz/

No additional dependencies or installation required. Just open the HTML file in any modern web browser.

## Technical Details

- Uses SchaleDB's GitHub repository for student data
- Pure HTML, CSS, and JavaScript (no frameworks required)
- LocalStorage for theme preference persistence
- Responsive design with CSS Grid and Flexbox

## Data Source

Student data is fetched from SchaleDB's public API. All character information and images are property of their respective owners.

## Browser Compatibility

Works on all modern browsers:
- Chrome/Chromium
- Firefox
- Safari
- Edge
