document.addEventListener('DOMContentLoaded', () => {
    quizApp.init();
});

let isSoundEnabled = true;
let gameState = {
    score: 0,
    streak: 0,
    level: 'Graduação',
    distinctivo: '🎓',
    updateLevelAndDistinctive() {
        const levels = [
            { name: 'Graduação', points: 0, emoji: '🎓' },
            { name: 'Graduado', points: 100, emoji: '👨‍🎓' },
            { name: 'Mestrando', points: 200, emoji: '👩‍🎓' },
            { name: 'Mestre', points: 300, emoji: '🧑‍🏫' },
            { name: 'Doutorando', points: 400, emoji: '👨‍🔬' },
            { name: 'Doutor', points: 500, emoji: '👩‍🔬' },
        ];

        for (let level of levels) {
            if (this.score >= level.points) {
                this.level = level.name;
                this.distinctivo = level.emoji;
            } else {
                break;
            }
        }
    },
    reset() {
        this.score = 0;
        this.streak = 0;
        this.level = 'Graduação';
        this.distinctivo = '🎓';
        this.updateLevelAndDistinctive();
    }
};

const quizApp = {
    questions: [],
    currentQuestionIndex: 0,
    currentCategory: 'portugues',
    score: 0,
    timerDuration: 30,
    timerInterval: null,

    init() {
        document.getElementById('startButton').addEventListener('click', this.startGame.bind(this));
        document.getElementById('changeCategory').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.startGame();
        });
        document.getElementById('restartButton').addEventListener('click', this.restartGame.bind(this));
        document.getElementById('soundToggle').addEventListener('click', () => {
            isSoundEnabled = !isSoundEnabled;
        });
        document.getElementById('themeSelector').addEventListener('change', function() {
            const selectedTheme = this.value;
            document.body.className = selectedTheme;
            localStorage.setItem('selectedTheme', selectedTheme);
        });

        const savedTheme = localStorage.getItem('selectedTheme') || 'light';
        document.body.className = savedTheme;
        document.getElementById('themeSelector').value = savedTheme;

        window.addEventListener('load', () => {
            const elements = document.querySelectorAll('.container, input, #startButton');
            elements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });

        const socket = io();

        socket.emit('enviar mensagem', { mensagem: 'Olá, mundo!' });

        socket.on('nova mensagem', (data) => {
            console.log(data);
        });
    },

    startGame() {
        this.score = 0;
        this.currentQuestionIndex = 0;
        changeScreen(document.getElementById('welcomeScreen'), document.getElementById('gameScreen'));
        this.loadQuestions(this.currentCategory);
    },

    loadQuestions(category) {
        fetch(`data/${category}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar as perguntas.');
                }
                return response.json();
            })
            .then(data => {
                shuffleArray(data.questions || data);
                this.questions = data.questions || data;
                this.currentQuestionIndex = 0;
                this.displayQuestion();
                this.updateQuestionCounter();
                this.startTimer(this.timerDuration);
            })
            .catch(error => {
                console.error('Erro:', error);
                this.finalizarJogo();
            });
    },

    displayQuestion() {
        const questionEl = document.getElementById('question');
        const choicesEl = document.getElementById('choices');
        const submitButton = document.getElementById('submit');

        questionEl.innerHTML = '';
        choicesEl.innerHTML = '';
        document.getElementById('result').textContent = '';

        if (this.currentQuestionIndex < this.questions.length) {
            const currentQuestion = this.questions[this.currentQuestionIndex];

            if (currentQuestion.text) {
                const textEl = document.createElement('p');
                textEl.textContent = currentQuestion.text;
                questionEl.appendChild(textEl);
            }

            const questionTextEl = document.createElement('p');
            questionTextEl.textContent = currentQuestion.question;
            questionEl.appendChild(questionTextEl);

            currentQuestion.choices.forEach(choice => {
                const button = document.createElement('button');
                button.textContent = choice;
                button.className = 'choice';
                button.addEventListener('click', () => this.selectChoice(choice, currentQuestion.answer));
                choicesEl.appendChild(button);
            });

            submitButton.style.display = 'block';
        } else {
            this.finalizarJogo();
        }
    },

    selectChoice(choice, correctAnswer) {
        const resultEl = document.getElementById('result');
        const submitButton = document.getElementById('submit');

        if (choice === correctAnswer) {
            resultEl.textContent = 'Correto!';
            resultEl.className = 'correct';
            this.score++;
            updateScore(true, this.timerDuration);
            playCorrectSound();
        } else {
            resultEl.textContent = 'Errado!';
            resultEl.className = 'incorrect';
            updateScore(false);
            playIncorrectSound();
        }

        const choiceButtons = document.querySelectorAll('.choice');
        choiceButtons.forEach(button => {
            if (button.textContent === choice) {
                displayFeedback(choice === correctAnswer, button);
            }
            button.disabled = true;
        });

        submitButton.onclick = () => {
            clearInterval(this.timerInterval);
            if (this.currentQuestionIndex < this.questions.length - 1) {
                this.currentQuestionIndex++;
                this.displayQuestion();
                this.startTimer(this.timerDuration);
                this.updateQuestionCounter();
            } else {
                this.finalizarJogo();
            }
        };
    },

    startTimer(duration) {
        clearInterval(this.timerInterval);
        let timeLeft = duration;
        const timerBar = document.getElementById('timerBar');
        updateTimerBar(100);

        this.timerInterval = setInterval(() => {
            timeLeft -= 1;
            const percentage = (timeLeft / duration) * 100;
            updateTimerBar(percentage);

            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
            }
        }, 1000);
    },

    updateQuestionCounter() {
        const counterElement = document.getElementById('questionCounter');
        counterElement.textContent = `Pergunta ${this.currentQuestionIndex + 1} de ${this.questions.length}`;
    },

    finalizarJogo() {
        clearInterval(this.timerInterval);
        changeScreen(document.getElementById('gameScreen'), document.getElementById('endScreen'));
        document.getElementById('finalScore').textContent = `Seu Score: ${this.score}`;
        shareScoreOnWhatsApp(this.score);
    },

    restartGame() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        resetGame();
        changeScreen(document.getElementById('endScreen'), document.getElementById('welcomeScreen'));
        document.getElementById('timer').textContent = '';
    }
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateTimerBar(percentage) {
    const timerBar = document.getElementById('timerBar');
    timerBar.style.width = `${percentage}%`;

    if (percentage > 66) {
        timerBar.style.backgroundColor = "#4CAF50"; // Verde para mais de 66%
    } else if (percentage > 33) {
        timerBar.style.backgroundColor = "#FFEB3B"; // Amarelo para mais de 33% e até 66%
    } else {
        timerBar.style.backgroundColor = "#F44336"; // Vermelho para 33% ou menos
    }
}

function changeScreen(fromScreen, toScreen) {
    fromScreen.classList.remove('screen-active');
    setTimeout(() => {
        fromScreen.style.display = 'none';
        toScreen.style.display = 'block';
        setTimeout(() => {
            toScreen.classList.add('screen-active');
        }, 10); // Pequeno delay para garantir que a tela esteja visível antes de adicionar a classe
    }, 500); // Deve corresponder à duração da transição CSS
}

function displayFeedback(isCorrect, choiceElement) {
    const icon = document.createElement('span');
    icon.innerHTML = isCorrect ? '✅' : '❌';
    icon.className = isCorrect ? 'correct-icon' : 'incorrect-icon';
    choiceElement.appendChild(icon);
}

function playCorrectSound() {
    if (isSoundEnabled) {
        playBeep(520, 200); // Beep alto para resposta correta
    }
}

function playIncorrectSound() {
    if (isSoundEnabled) {
        playBeep(140, 300); // Beep mais grave para resposta incorreta
    }
}

function initAudioContext() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
}

function playBeep(frequency, duration) {
    const audioContext = initAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine'; // Tipo de onda do som (sine, square, sawtooth, triangle)
    oscillator.frequency.value = frequency; // Frequência em Hertz
    gainNode.gain.value = 0.1; // Volume do som
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000); // Converter duração para segundos
}

function updateScore(isCorrect, timeLeft) {
    if (isCorrect) {
        let timeBonus = (timeLeft / timerDuration) * timeBonusMax;
        score += 10 + timeBonus + (streak * streakBonus);
        streak++;
    } else {
        streak = 0;
    }
    // Atualize a interface do usuário (UI) aqui
    document.getElementById('scoreDisplay').textContent = `Pontuação: ${score}`;
    document.getElementById('streakDisplay').textContent = `Sequência de Acertos: ${streak}`;
}

const webAppUrl = 'https://script.google.com/macros/s/AKfycbxaPVkTVFCajKF5Xv0o9jq5AEmMiqBxCsMQhZs4zIJDtKY-8_Y-M5UiIXZnzjHJccQx/exec';

function addScore(username, score) {
    fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score })
    })
        .then(() => console.log('Pontuação enviada com sucesso'))
        .catch(error => console.error('Erro ao enviar pontuação:', error));
}

function resetGame() {
    score = 0;
    streak = 0;
    // Reinicie a UI aqui
    document.getElementById('scoreDisplay').textContent = `Pontuação: ${score}`;
    document.getElementById('streakDisplay').textContent = `Sequência de Acertos: ${streak}`;
}

function shareScoreOnWhatsApp(score) {
    // Implemente a lógica para compartilhar a pontuação no WhatsApp
    console.log(`Pontuação compartilhada no WhatsApp: ${score}`);
}

const usuarioLogado = {
    pontos: 100,
    nivel: 'Iniciante',
    distintivo: 'url_para_o_distintivo_Iniciante.png'
};

const niveis = {
    'Iniciante': 0,
    'Intermediário': 50,
    'Avançado': 100
};

function atribuirPontos(usuario, pontos) {
    usuario.pontos += pontos;
}

function realizarAcao() {
    atribuirPontos(usuarioLogado, pontosDaAcao);
    verificarNivel(usuarioLogado);
}

function verificarNivel(usuario) {
    for (const [nivel, pontos] of Object.entries(niveis)) {
        if (usuario.pontos >= pontos) {
            usuario.nivel = nivel;
        }
    }
}

function atualizarInterface(usuario) {
    document.getElementById('nivelUsuario').innerText = usuario.nivel;
}

function verificarNivelComDistintivo(usuario) {
    for (const [nivel, pontos] of Object.entries(niveis)) {
        if (usuario.pontos >= pontos) {
            usuario.nivel = nivel;
            usuario.distintivo = obterDistintivo(nivel);
        }
    }
}

function obterDistintivo(nivel) {
    return `url_para_o_distintivo_${nivel}.png`;
}

function atualizarInterfaceComDistintivo(usuario) {
    document.getElementById('nivelUsuario').innerText = usuario.nivel;
    document.getElementById('distintivoUsuario').style.backgroundImage = `url(${usuario.distintivo})`;
}

let score = 0;
let streak = 0;
let timeBonusMax = 50;
let streakBonus = 10;
const timerDuration = 10;

function loadQuestions(category) {
    fetch(`data/${category}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar as perguntas.');
            }
            return response.json();
        })
        .then(data => {
            shuffleArray(data.questions || data);
            this.questions = data.questions || data;
            this.currentQuestionIndex = 0;
            this.displayQuestion();
            this.updateQuestionCounter();
            this.startTimer(this.timerDuration);
        })
        .catch(error => {
            console.error('Erro:', error);
            this.finalizarJogo();
        });
}

const socket = io();

socket.emit('enviar mensagem', { mensagem: 'Olá, mundo!' });

socket.on('nova mensagem', (data) => {
    console.log(data);
});
