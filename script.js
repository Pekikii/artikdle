document.addEventListener("DOMContentLoaded", function () {

    // Helper: parse CSV string to array of objects
    function parseCSV(data) {
        const lines = data.trim().split('\n');
        const [headerLine, ...rows] = lines;
        const headers = headerLine.split(',');

        return rows.map(row => {
            const values = row.split(',');
            return {
                [headers[0]]: values[0].trim(),
                [headers[1]]: values[1].trim()
            };
        });
    }

    // Helper: get seed from today's date for repeatable "random"
    function getSeedFromDate() {
        const now = new Date();
        return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate(); // YYYYMMDD
    }

    // Helper: deterministic random indices from seed
    function getDeterministicRandomIndices(arrayLength, count, seed) {
        const indices = [];
        let current = seed;
        while (indices.length < count) {
            current = (current * 9301 + 49297) % 233280;
            const index = Math.floor((current / 233280) * arrayLength);
            if (!indices.includes(index)) {
                indices.push(index);
            }
        }
        return indices;
    }

    // Helper: format seconds to mm:ss
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // LocalStorage key for today
    function getTodayKey() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `quiz-done-${yyyy}-${mm}-${dd}`;
    }

    // Show message if quiz completed today

    function showCompletedMessage(score, total, time) {
        const quizBox = document.querySelector('.quiz-box');
        quizBox.innerHTML = `
            <h2>✅ You've already completed today's quiz!</h2>
            <p class="score">Score: ${score} / ${total}</p>
            <p class="timer">Time: ${formatTime(time)}</p>
            <p>Come back tomorrow for a new quiz.</p>
            <p class="countdown"><span id="countdown-timer">⏳ Calculating...</span></p>
        `;

        // Live countdown to midnight
        const countdownEl = document.getElementById('countdown-timer');

        function updateCountdown() {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0); // midnight

            const diffMs = tomorrow - now;
            const diffSec = Math.floor(diffMs / 1000);

            const hours = Math.floor(diffSec / 3600);
            const minutes = Math.floor((diffSec % 3600) / 60);
            const seconds = diffSec % 60;

            countdownEl.textContent = `⏳ Next quiz in: ${hours}h ${minutes}m ${seconds}s`;
        }

        updateCountdown(); // run once immediately
        setInterval(updateCountdown, 1000); // update every second
    }

    // Start the quiz UI and logic
    function startQuiz(allEntries, todayKey) {
        const seed = getSeedFromDate();
        const selectedIndices = getDeterministicRandomIndices(allEntries.length, 5, seed);
        const quizEntries = selectedIndices.map(i => allEntries[i]);

        const quizBox = document.querySelector('.quiz-box');
        quizBox.innerHTML = ''; // Clear existing content

        const title = document.createElement('h2');
        title.textContent = "📝 Daily Quiz - 5 Words";
        quizBox.appendChild(title);

        // Timer display
        const timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer';
        timerDisplay.textContent = 'Time: 0:00';
        quizBox.appendChild(timerDisplay);

        let startTime = Date.now();
        let timerInterval = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            timerDisplay.textContent = `Time: ${formatTime(elapsedSeconds)}`;
        }, 1000);

        const form = document.createElement('form');
        form.id = 'quizForm';



        quizEntries.forEach((entry, index) => {
            const container = document.createElement('div');
            container.classList.add('quiz-row');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.marginBottom = '8px';
            container.style.gap = '12px';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `answer-${index}`;
            input.dataset.correct = entry.art;
            input.placeholder = ''; // no placeholder
            input.style.width = '80px'; // enough for "plural"
            input.style.padding = '4px 6px';
            input.style.fontSize = '14px';

            // Handle Enter key navigation
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault(); // prevent form submit

                    const allInputs = form.querySelectorAll('input');
                    const currentIndex = Array.from(allInputs).indexOf(input);

                    if (currentIndex < allInputs.length - 1) {
                        allInputs[currentIndex + 1].focus();
                    } else {
                        form.requestSubmit(); // submit the form programmatically
                    }
                }
            });

            const wordSpan = document.createElement('span');
            wordSpan.textContent = entry.word;
            wordSpan.className = 'quiz-word';
            wordSpan.style.fontSize = '16px';
            wordSpan.style.fontWeight = '500';

            container.appendChild(input);
            container.appendChild(wordSpan);
            form.appendChild(container);
        });

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.textContent = 'Submit Answers';
        form.appendChild(submitBtn);

        const feedbackBox = document.createElement('div');
        feedbackBox.className = 'feedback';
        form.appendChild(feedbackBox);

        const scoreBox = document.createElement('div');
        scoreBox.className = 'score';
        form.appendChild(scoreBox);

        quizBox.appendChild(form);


        form.addEventListener('submit', function (e) {
            e.preventDefault();

            clearInterval(timerInterval); // Stop the timer
            const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000);

            let score = 0;
            let feedbackHTML = '';

            // Map user input to internal code
            function mapUserInput(input) {
                const normalized = input.trim().toLowerCase();
                if (normalized === 'der') return 'm';
                if (normalized === 'die') return 'f';
                if (normalized === 'das') return 'n';
                if (normalized === 'plural') return 'p';
                return ''; // no match
            }

            quizEntries.forEach((entry, index) => {
                const input = document.getElementById(`answer-${index}`);
                const userAnswer = mapUserInput(input.value);
                const correct = entry.art.toLowerCase();

                if (userAnswer === correct) {
                    feedbackHTML += `✅ "${entry.word}": Correct!<br>`;
                    input.style.borderColor = 'green';
                    score++;
                } else {
                    feedbackHTML += `❌ "${entry.word}": Correct answer is "${correct === 'm' ? 'der' : correct === 'f' ? 'die' : correct === 'n' ? 'das' : 'Plural'}"<br>`;
                    input.style.borderColor = 'red';
                }

                input.disabled = true;
            });

            feedbackBox.innerHTML = feedbackHTML;
            scoreBox.textContent = `You scored ${score} out of ${quizEntries.length} in ${formatTime(totalTimeSeconds)}.`;
            submitBtn.disabled = true;

            // Save quiz completion to localStorage
            localStorage.setItem(todayKey, JSON.stringify({
                score: score,
                total: quizEntries.length,
                time: totalTimeSeconds
            }));
        });
    }

    // Main logic: check if quiz done today or start fresh
    const todayKey = getTodayKey();
    const completedData = localStorage.getItem(todayKey);

    if (completedData) {
        const { score, total, time } = JSON.parse(completedData);
        showCompletedMessage(score, total, time);
    } else {
        const allEntries = parseCSV(csvData);
        startQuiz(allEntries, todayKey);
    }
});
