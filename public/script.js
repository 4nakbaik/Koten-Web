document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let vocabularyData = [];
    let currentCardData = null; 
    let isFlipping = false;
    let retroEffectInterval; 
    
    // User Stats (Pake Local Cache)
    let userStats = JSON.parse(localStorage.getItem('jp_user_stats')) || {
        xp: 0, level: 1, cardsSeen: 0, quizCorrect: 0
    };

    // Quiz Arcade State
    let quizScore = 0; let quizLives = 3; let timerInterval; let timeLeft = 100;
    let comboCount = 0; let currentQuizItem = null; let isQuizAnswering = false;
    let lastQuestionId = -1; let isGameRunning = false; 

    // Exam State
    let examData = [];
    let examIndex = 0;
    let examScoreVal = 0;
    let examTimerInterval;
    let examTimeLeft = 0;
    let userAnswers = []; 
    const EXAM_DURATION_SEC = 8 * 60; 

    // --- AUDIO SET ---
    const sounds = {
        flip: new Audio('audio/flip.mp3'),
        correct: new Audio('audio/correct.mp3'),
        wrong: new Audio('audio/wrong.mp3'),
        bgm: new Audio('audio/tetris.mp3'),
        gameover: new Audio('audio/gameover.wav')
    };
    
    Object.values(sounds).forEach(s => s.volume = 0.5);
    sounds.bgm.volume = 0.3; 
    sounds.bgm.loop = true; 

    function playSound(type) {
        if (sounds[type]) {
            if (type !== 'bgm') {
                sounds[type].currentTime = 0;
            } else {
                if (!sounds[type].paused) return;
            }
            sounds[type].play().catch(() => {});
        }
    }

    function stopBGM() {
        sounds.bgm.pause();
        sounds.bgm.currentTime = 0;
    }

    function getDeviceId() {
        let deviceId = localStorage.getItem('nq_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('nq_device_id', deviceId);
        }
        return deviceId;
    }

    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-device-id': getDeviceId() 
        };
    }

    // --- DOM REFERENCES ---
    const dom = {
        card: document.getElementById('flashcard'),
        kanji: document.getElementById('kanji'), kana: document.getElementById('kana'),
        romaji: document.getElementById('romaji'), meaning: document.getElementById('meaning'),
        example: document.getElementById('example'), cornerMark: document.getElementById('level-badge'),
        
        n5ProgressText: document.getElementById('n5-progress-text'),
        n4LockStatus: document.getElementById('n4-lock-status'),
        hudMasteryBar: document.getElementById('hud-mastery-bar'),
        
        quizLobby: document.getElementById('quiz-lobby'), quizGameplay: document.getElementById('quiz-gameplay'),
        qQuestion: document.getElementById('q-question'), qHint: document.getElementById('q-hint'),
        optsContainer: document.getElementById('options-container'),
        qScore: document.getElementById('quiz-score'), qLives: document.getElementById('quiz-lives'),
        qFeedback: document.getElementById('quiz-feedback'), qRestart: document.getElementById('btn-restart'),
        timerBar: document.getElementById('timer-bar'), comboDisplay: document.getElementById('combo-display'),
        retroBg: document.getElementById('view-quiz'), 
        
        examQuestion: document.getElementById('exam-question'),
        examOptions: document.querySelector('.exam-options'), 
        examTimerText: document.getElementById('exam-timer-text'),
        examCounter: document.getElementById('exam-counter'),
        examProgressBar: document.getElementById('exam-progress-bar'),
        examModal: document.getElementById('exam-result-modal'),
        examFinalScore: document.getElementById('exam-final-score'),
        resCorrect: document.getElementById('res-correct'),
        resWrong: document.getElementById('res-wrong'),
        examMsg: document.getElementById('exam-msg'),
        mainNav: document.getElementById('main-nav'),

        userLevel: document.getElementById('user-level'), currentXP: document.getElementById('current-xp'),
        nextXP: document.getElementById('next-xp'), xpBar: document.getElementById('xp-bar'),
        userRank: document.getElementById('user-rank'), 
        statSeen: document.getElementById('stat-seen'),
        
        kanaGrid: document.getElementById('kana-grid')
    };

    // --- INITIALIZATION ---
    loadProfile();
    fetchVocab();
    renderChart('hira'); 
    updateStatsUI();

    // --- 1. DATA FETCHING ---
    async function fetchVocab() {
        try {
            const res = await fetch('/api/vocab', { headers: getHeaders() });
            const response = await res.json();
            vocabularyData = response.data; 
            const meta = response.meta;

            const statsRes = await fetch('/api/stats', { headers: getHeaders() });
            const statsData = await statsRes.json();

            if (dom.n5ProgressText) dom.n5ProgressText.textContent = `${meta.n5_mastery}%`;
            if (dom.hudMasteryBar) dom.hudMasteryBar.style.width = `${meta.n5_mastery}%`;
            if (dom.statSeen) dom.statSeen.textContent = statsData.count_learned;
            
            if (dom.n4LockStatus) {
                if(meta.n4_unlocked) {
                    dom.n4LockStatus.innerHTML = '<i class="fas fa-unlock"></i> N4 UNLOCKED';
                    dom.n4LockStatus.className = 'lock-status unlocked';
                } else {
                    dom.n4LockStatus.innerHTML = '<i class="fas fa-lock"></i> N4 LOCKED';
                    dom.n4LockStatus.className = 'lock-status';
                }
            }

            if (vocabularyData.length > 0) updateCardUI();
            else if(dom.kanji) dom.kanji.textContent = "Selesai!";
        } catch (e) {
            console.error(e);
            if(dom.kanji) dom.kanji.textContent = "Error DB";
        }
    }

    // --- 2. FLASHCARD LOGIC ---
    function updateCardUI() {
        if (!vocabularyData || vocabularyData.length === 0) return;
        const data = vocabularyData[0]; 
        currentCardData = data;

        const hasKanji = data.kanji && data.kanji !== "null";
        dom.kanji.textContent = hasKanji ? data.kanji : data.kana;
        dom.kana.textContent = hasKanji ? data.kana : ""; 
        dom.kana.style.display = hasKanji ? 'block' : 'none';

        dom.romaji.textContent = data.romaji;
        dom.meaning.textContent = data.meaning;
        dom.example.textContent = data.example_sentence ? `"${data.example_sentence}"` : "";

        const lvlText = (data.difficulty_level === 2) ? "N4" : "N5";
        if(dom.cornerMark) {
            dom.cornerMark.textContent = lvlText;
            if (lvlText === "N4") dom.cornerMark.classList.add('n4-mode');
            else dom.cornerMark.classList.remove('n4-mode');
        }
    }

    window.flipCard = function() {
        if (isFlipping) return;
        playSound('flip'); 
        dom.card.classList.toggle('is-flipped');
    };

    window.submitReview = async function(result, e) {
        if (e) e.stopPropagation();
        if (!currentCardData) return;

        if (dom.card.classList.contains('is-flipped')) {
            isFlipping = true;
            dom.card.classList.remove('is-flipped');
            playSound('flip');
        }

        try {
            const res = await fetch('/api/review', {
                method: 'POST',
                headers: getHeaders(), 
                body: JSON.stringify({ 
                    vocabId: currentCardData.id, 
                    result: result,
                    source: 'flashcard' 
                })
            });
            const json = await res.json();
            
            if(json.success) {
                userStats.cardsSeen++;
                saveStats();
                
                vocabularyData.shift(); 
                if (vocabularyData.length === 0) {
                    await fetchVocab(); 
                } else {
                    setTimeout(() => {
                        updateCardUI();
                        isFlipping = false;
                    }, 300);
                }
            } else {
                isFlipping = false;
            }
        } catch(err) {
            console.error(err);
            isFlipping = false;
        }
    };

    // --- 3. EXAM MODE LOGIC ---
    window.startExamMode = async function() {
        try {
            const res = await fetch('/api/exam', { headers: getHeaders() });
            examData = await res.json();
            
            if(!examData || examData.length === 0) {
                alert("Data ujian belum siap."); return;
            }

            examIndex = 0; userAnswers = []; examTimeLeft = EXAM_DURATION_SEC;
            switchView('exam');
            renderExamQuestion();
            startGlobalTimer();
            
        } catch(e) { console.error("Exam Error", e); }
    };

    function startGlobalTimer() {
        clearInterval(examTimerInterval);
        updateTimerDisplay();
        examTimerInterval = setInterval(() => {
            examTimeLeft--;
            updateTimerDisplay();
            if (examTimeLeft <= 0) { clearInterval(examTimerInterval); finishExam(true); }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(examTimeLeft / 60);
        const seconds = examTimeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if(dom.examTimerText) {
            dom.examTimerText.textContent = timeString;
            if(examTimeLeft < 60) dom.examTimerText.style.color = "#e74c3c";
            else dom.examTimerText.style.color = "#fff";
        }
    }

    function renderExamQuestion() {
        if (examIndex >= examData.length) { finishExam(false); return; }
        const current = examData[examIndex];
        
        dom.examCounter.textContent = `${examIndex + 1} / ${examData.length}`;
        const progressPct = ((examIndex) / examData.length) * 100;
        if(dom.examProgressBar) dom.examProgressBar.style.width = `${progressPct}%`;
        
        if(dom.examQuestion) {
            dom.examQuestion.innerHTML = current.question.replace(/\n/g, '<br>');
            dom.examQuestion.style.fontSize = "1.1rem"; 
            dom.examQuestion.style.textAlign = "left";
        }

        const buttons = dom.examOptions.children;
        const shuffledOptions = current.options.sort(() => 0.5 - Math.random());
        for(let i=0; i<4; i++) {
            buttons[i].textContent = shuffledOptions[i].text;
            buttons[i].dataset.isCorrect = shuffledOptions[i].correct;
            buttons[i].disabled = false;
            buttons[i].className = `exam-opt ${['opt-red','opt-blue','opt-green','opt-yellow'][i]}`;
            buttons[i].style.opacity = "1";
            buttons[i].onclick = () => recordAnswer(buttons[i], current.id);
        }
    }

    window.recordAnswer = function(btn, questionId) {
        const buttons = dom.examOptions.children;
        for(let b of buttons) { b.disabled = true; b.style.opacity = "0.5"; }
        btn.style.opacity = "1"; btn.classList.add('selected');

        userAnswers.push({ questionId: questionId, isCorrect: (btn.dataset.isCorrect === "true") });
        setTimeout(() => { examIndex++; renderExamQuestion(); }, 300); 
    };

    async function finishExam(isTimeout) {
        clearInterval(examTimerInterval);
        
        let correctCount = userAnswers.filter(a => a.isCorrect).length;
        let totalScore = correctCount * 100; 
        
        // XP JIKA LULUS (Paling Min 12 Yg Benar)
        if (correctCount >= 12) { 
            addXP(correctCount * 30); 
            userStats.quizCorrect += correctCount;
            saveStats();
            dom.examMsg.textContent = "Lulus! XP Didapat!";
            playSound('correct');
        } else {
            dom.examMsg.textContent = "Gagal. Belum cukup untuk dapat XP.";
            playSound('wrong');
        }

        dom.examModal.style.display = 'flex';
        dom.examFinalScore.textContent = totalScore;
        if(document.getElementById('res-correct')) document.getElementById('res-correct').textContent = correctCount;
        if(document.getElementById('res-wrong')) document.getElementById('res-wrong').textContent = userAnswers.length - correctCount;

        if(isTimeout) dom.examMsg.textContent = "Waktu Habis!";
        for (const ans of userAnswers) {
            try {
                await fetch('/api/review', {
                    method: 'POST',
                    headers: getHeaders(), 
                    body: JSON.stringify({ vocabId: ans.vocabId, result: ans.isCorrect ? 2 : 0, source: 'exam' })
                });
            } catch(e) {}
        }
        fetchVocab(); 
    }

    window.closeExam = function() {
        dom.examModal.style.display = 'none';
        dom.mainNav.style.display = 'flex';
        switchView('progress');
    };

    // --- 4. ARCADE QUIZ LOGIC ---
    function startMatrixEffect() {
        if (retroEffectInterval) clearInterval(retroEffectInterval);
        let effectContainer = document.getElementById('retro-effect-layer');
        if(!effectContainer) {
            effectContainer = document.createElement('div');
            effectContainer.id = 'retro-effect-layer';
            effectContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:0;pointer-events:none;";
            dom.quizLobby.parentElement.insertBefore(effectContainer, dom.quizLobby);
        }
        const chars = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
        retroEffectInterval = setInterval(() => {
            const span = document.createElement('span');
            span.textContent = chars[Math.floor(Math.random() * chars.length)];
            span.className = 'falling-char';
            span.style.cssText = `position:absolute;top:-30px;left:${Math.random()*100}%;color:rgba(0,255,204,0.3);font-family:'DotGothic16';font-size:${Math.random()*1.5+0.5}rem;animation:fall ${Math.random()*3+2}s linear forwards;`;
            effectContainer.appendChild(span);
            setTimeout(() => { span.remove(); }, 5000);
        }, 150);
    }
    function stopMatrixEffect() { clearInterval(retroEffectInterval); if(document.getElementById('retro-effect-layer')) document.getElementById('retro-effect-layer').innerHTML = ''; }

    window.initGame = function() {
        if (vocabularyData.length < 4) { alert("Data sedang dimuat..."); return; }
        dom.quizLobby.style.display = 'none'; dom.quizGameplay.style.display = 'flex';
        startQuizSession();
    };
    window.backToLobby = function() {
        stopBGM(); sounds.gameover.pause(); sounds.gameover.currentTime = 0;
        dom.quizLobby.style.display = 'flex'; dom.quizGameplay.style.display = 'none';
        isGameRunning = false; clearInterval(timerInterval);
        if(document.getElementById('view-quiz').classList.contains('active-view')) playSound('bgm');
    };
    function startQuizSession() {
        isGameRunning = true; quizScore = 0; quizLives = 3; isQuizAnswering = false;
        dom.qRestart.style.display = 'none'; dom.optsContainer.style.display = 'grid'; 
        dom.qFeedback.textContent = ""; playSound('bgm'); updateScoreUI(); nextQuestion();
    }
    function nextQuestion() {
        isQuizAnswering = false; dom.qFeedback.textContent = "";
        if(quizLives > 0) sounds.bgm.play().catch(()=>{});
        clearInterval(timerInterval); startTimer();
        document.querySelectorAll('.retro-opt').forEach((btn) => { btn.className = 'retro-opt'; btn.disabled = false; btn.innerHTML = `...`; });
        let correctItem = vocabularyData[Math.floor(Math.random() * vocabularyData.length)];
        if(correctItem.id === lastQuestionId && vocabularyData.length > 1) correctItem = vocabularyData[Math.floor(Math.random() * vocabularyData.length)];
        currentQuizItem = correctItem; lastQuestionId = currentQuizItem.id;

        const hasKanji = currentQuizItem.kanji && currentQuizItem.kanji !== "null";
        dom.qQuestion.textContent = hasKanji ? currentQuizItem.kanji : currentQuizItem.kana;
        dom.qHint.textContent = "SELECT ANSWER"; 
        
        let options = [currentQuizItem];
        while (options.length < 4) {
            const rand = vocabularyData[Math.floor(Math.random() * vocabularyData.length)];
            if (!options.some(o => o.id === rand.id)) options.push(rand);
        }
        options.sort(() => Math.random() - 0.5);
        document.querySelectorAll('.retro-opt').forEach((btn, i) => {
            btn.innerHTML = `${options[i].meaning}`; btn.dataset.correct = (options[i].id === currentQuizItem.id);
        });
    }
    function startTimer() {
        timeLeft = 100; dom.timerBar.style.width = '100%'; dom.timerBar.style.backgroundColor = '#00ffcc';
        timerInterval = setInterval(() => {
            timeLeft -= 1.5; dom.timerBar.style.width = `${timeLeft}%`;
            if (timeLeft < 30) dom.timerBar.style.backgroundColor = '#ff0055'; 
            if (timeLeft <= 0) { clearInterval(timerInterval); handleTimeOut(); }
        }, 100); 
    }
    function handleTimeOut() {
        if (isQuizAnswering) return; isQuizAnswering = true; stopBGM(); playSound('wrong'); 
        quizLives--; updateComboUI(); dom.qFeedback.textContent = "TIME UP!"; dom.qFeedback.style.color = "#ff0055";
        revealCorrectAnswer(); checkGameStatus();
    }
    window.checkAnswer = function(btn) {
        if (isQuizAnswering) return; isQuizAnswering = true; clearInterval(timerInterval); stopBGM(); 
        const isCorrect = btn.dataset.correct === "true";
        if (isCorrect) {
            playSound('correct'); btn.classList.add('correct'); comboCount++; 
            quizScore += 100 + (comboCount * 10); addXP(5); userStats.quizCorrect++; saveStats();
            dom.qFeedback.textContent = "PERFECT!"; dom.qFeedback.style.color = "#00ffcc";
            updateComboUI(); setTimeout(nextQuestion, 1500); 
        } else {
            playSound('wrong'); btn.classList.add('wrong'); quizLives--; comboCount = 0; updateComboUI();
            dom.qFeedback.textContent = "MISS!"; dom.qFeedback.style.color = "#ff0055";
            revealCorrectAnswer(); checkGameStatus();
        }
        updateScoreUI();
    };
    function revealCorrectAnswer() { document.querySelectorAll('.retro-opt').forEach(b => { if (b.dataset.correct === "true") b.classList.add('correct'); }); }
    function checkGameStatus() { updateScoreUI(); if (quizLives > 0) setTimeout(nextQuestion, 2000); else setTimeout(endQuiz, 1500); }
    function updateComboUI() { if (comboCount > 1) dom.comboDisplay.textContent = `${comboCount} HIT COMBO!`; else dom.comboDisplay.textContent = ""; }
    function updateScoreUI() { dom.qScore.textContent = quizScore.toString().padStart(4, '0'); let hearts = ""; for(let i=0; i<3; i++) hearts += (i < quizLives) ? "❤" : "💀"; dom.qLives.textContent = hearts; }
    function endQuiz() { stopBGM(); playSound('gameover'); clearInterval(timerInterval); dom.optsContainer.style.display = 'none'; dom.qQuestion.textContent = "GAME OVER"; dom.qHint.textContent = `FINAL SCORE: ${quizScore}`; dom.qRestart.style.display = 'inline-block'; dom.qFeedback.textContent = ""; dom.timerBar.style.width = '0%'; }

    // --- 5. XP & LEVEL SYSTEM ---
    function calculateLevelInfo(totalXP) {
        let level = 1; let accumulatedXP = 0;
        while (true) {
            let xpForNext = 500 + (level * 200) + Math.floor(Math.pow(level, 1.8) * 50);
            if (totalXP < accumulatedXP + xpForNext) {
                return { level, currentLevelBaseXP: accumulatedXP, nextLevelReq: accumulatedXP + xpForNext, xpInCurrentLevel: totalXP };
            }
            accumulatedXP += xpForNext; level++;
        }
    }

    function addXP(amount) {
        const oldLevel = userStats.level; userStats.xp += amount; if(userStats.xp < 0) userStats.xp = 0;
        const info = calculateLevelInfo(userStats.xp); userStats.level = info.level;
        if (userStats.level > oldLevel) alert(`🎉 LEVEL UP! Level ${userStats.level}`);
        saveStats();
    }
    function saveStats() { localStorage.setItem('jp_user_stats', JSON.stringify(userStats)); updateStatsUI(); }
    function getRankTitle(lvl) { const ranks = ["Wibu KW", "Anime Lovers", "Wibu Sejati", "Sensei", "Master", "Legend", "Hokage"]; const idx = Math.min(Math.floor((lvl - 1) / 5), ranks.length - 1); return ranks[idx]; }
    function updateStatsUI() {
        const info = calculateLevelInfo(userStats.xp); userStats.level = info.level; 
        if (dom.userLevel) dom.userLevel.textContent = userStats.level;
        if (document.getElementById('stat-level')) document.getElementById('stat-level').textContent = userStats.level;
        if (document.getElementById('stat-xp')) document.getElementById('stat-xp').textContent = userStats.xp;
        if (document.getElementById('stat-quiz')) document.getElementById('stat-quiz').textContent = userStats.quizCorrect;
        if (dom.currentXP) dom.currentXP.textContent = userStats.xp;
        if (dom.nextXP) dom.nextXP.textContent = info.nextLevelReq;
        const pct = Math.min(((userStats.xp - info.currentLevelBaseXP) / (info.nextLevelReq - info.currentLevelBaseXP)) * 100, 100);
        if (dom.xpBar) dom.xpBar.style.width = `${pct}%`;
        if (dom.userRank) dom.userRank.textContent = getRankTitle(userStats.level);
        if (document.getElementById('profile-rank')) document.getElementById('profile-rank').textContent = getRankTitle(userStats.level);
    }

    // --- 6. PROFILE ---
    function loadProfile() {
        const savedName = localStorage.getItem('jp_username'); const savedAvatar = localStorage.getItem('jp_avatar');
        if (savedName) document.getElementById('username-input').value = savedName;
        if (savedAvatar) document.getElementById('profile-img').src = savedAvatar;
    }
    window.saveProfile = function() { const nameVal = document.getElementById('username-input').value; if (nameVal.trim() !== "") localStorage.setItem('jp_username', nameVal); };
    window.uploadAvatar = function(input) { if (input.files && input.files[0]) { const reader = new FileReader(); reader.onload = function(e) { const img = new Image(); img.src = e.target.result; img.onload = function() { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const maxWidth = 150; const scaleSize = maxWidth / img.width; canvas.width = maxWidth; canvas.height = img.height * scaleSize; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); const dataUrl = canvas.toDataURL('image/jpeg', 0.7); document.getElementById('profile-img').src = dataUrl; localStorage.setItem('jp_avatar', dataUrl); } }; reader.readAsDataURL(input.files[0]); } };

    // --- 7. CHART (DARI DATA FILE) ---
    const kanjiList = window.KANJI_DATA || []; 

    window.switchChart = function(type) {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-${type}`).classList.add('active');
        renderChart(type);
    }

    function renderChart(type) {
        dom.kanaGrid.innerHTML = ""; 
        if (type === 'kanji') dom.kanaGrid.classList.add('grid-kanji-mode');
        else dom.kanaGrid.classList.remove('grid-kanji-mode');

        if (type === 'hira' || type === 'kata') {
            const hira = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
            const kata = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
            const romaji = ["a","i","u","e","o","ka","ki","ku","ke","ko","sa","shi","su","se","so","ta","chi","tsu","te","to","na","ni","nu","ne","no","ha","hi","fu","he","ho","ma","mi","mu","me","mo","ya","yu","yo","ra","ri","ru","re","ro","wa","wo","n"];
            const source = (type === 'hira') ? hira : kata;
            const chars = source.split('');
            chars.forEach((char, i) => {
                const div = document.createElement('div'); div.className = 'char-box';
                div.innerHTML = `<span class="char-jp">${char}</span><span class="char-en">${romaji[i]}</span>`;
                div.onclick = () => { const u = new SpeechSynthesisUtterance(char); u.lang = 'ja-JP'; window.speechSynthesis.speak(u); };
                dom.kanaGrid.appendChild(div);
            });
        } else if (type === 'kanji') {
            if(kanjiList.length === 0) {
                dom.kanaGrid.innerHTML = '<p style="color:#fff;text-align:center;">Data Kanji belum dimuat.</p>';
                return;
            }
            kanjiList.forEach(item => {
                const div = document.createElement('div'); div.className = 'kanji-box';
                div.innerHTML = `<span class="k-char">${item.k}</span><span class="k-mean">${item.m}</span><span class="k-read">${item.r}</span>`;
                div.onclick = () => { const u = new SpeechSynthesisUtterance(item.y); u.lang = 'ja-JP'; window.speechSynthesis.speak(u); };
                dom.kanaGrid.appendChild(div);
            });
        }
    }

    // --- 8. NAVIGATION ---
    window.switchView = function(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById(`view-${viewName}`).classList.add('active-view');
        
        const map = { 'home':0, 'quiz':1, 'chart':2, 'progress':3 };
        if(map[viewName] !== undefined) document.querySelectorAll('.nav-item')[map[viewName]].classList.add('active');

        if(viewName === 'exam') { dom.mainNav.style.display = 'none'; stopMatrixEffect(); } else { dom.mainNav.style.display = 'flex'; }
        if (viewName === 'quiz') { if (!isGameRunning) playSound('bgm'); startMatrixEffect(); } 
        else { stopBGM(); stopMatrixEffect(); if (isGameRunning && viewName !== 'exam') backToLobby(); }
    };

    // Keyboard Shortcuts Khusus Buat Dekstop
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('view-quiz').classList.contains('active-view') && !isQuizAnswering && isGameRunning) {
            if (e.key === '1') document.getElementById('btn-0')?.click();
            if (e.key === '2') document.getElementById('btn-1')?.click();
            if (e.key === '3') document.getElementById('btn-2')?.click();
            if (e.key === '4') document.getElementById('btn-3')?.click();
        } else if (document.getElementById('view-home').classList.contains('active-view')) {
            if (e.code === 'Space') window.flipCard();
            if (e.key === '1') window.submitReview(0);
            if (e.key === '2') window.submitReview(1);
            if (e.key === '3') window.submitReview(2);
        }
    });
});