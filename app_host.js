const QUESTION_TIME = 20000;
let channel = null; let pin = null;
let quiz = { title: 'Meu Quiz', questions: [ {text:'Qual linguagem usa exclusivamente palavras escritas ou faladas?', options:['Linguagem Mista','Linguagem Não Verbal','Linguagem Verbal','Linguagem Corporal'], correct:2} ] };
let participants = new Map(); let currentQIndex = -1; let deadline = null; let answers = new Map();

const pinInput = byId('pin-input'); const createBtn = byId('create-channel'); const pinStatus = byId('pin-status'); const qList = byId('question-list'); const addBtn = byId('add-question'); const clearBtn = byId('clear-editor'); const qText = byId('q-text'); const optInputs = [0,1,2,3].map(i=>byId('opt-'+i)); const correctIndex = byId('correct-index'); const downloadBtn = byId('download-quiz'); const uploadInput = byId('upload-quiz'); const participantList = byId('participant-list'); const countParticipants = byId('count-participants'); const startGameBtn = byId('start-game'); const nextQuestionBtn = byId('next-question'); const endGameBtn = byId('end-game'); const liveTitle = byId('live-title'); const liveQuestion = byId('live-question'); const liveOptions = byId('live-options'); const timerEl = byId('timer'); const leaderboardEl = byId('leaderboard'); const openPresenterBtn = byId('open-presenter');

function setConnected(state){ pinStatus.textContent = state ? `Conectado ao canal ${pin}` : 'Desconectado'; }

function clearState(){
  currentQIndex = -1; deadline = null; answers.clear();
  renderParticipants();
  liveTitle.textContent = 'Aguardando início...';
  liveQuestion.textContent = '';
  liveOptions.innerHTML = '';
  leaderboardEl.innerHTML = '';
}

function renderQuestions(){
  qList.innerHTML = quiz.questions.map((q,i)=>`<li>Pergunta ${i+1}: ${q.text}<button onclick="editQuestion(${i})">Editar</button><button onclick="deleteQuestion(${i})">Excluir</button></li>`).join('');
}

function editQuestion(index){
  const q = quiz.questions[index];
  if(!q) return;
  qText.value = q.text;
  q.options.forEach((opt,i) => optInputs[i].value = opt);
  correctIndex.value = q.correct;
  addBtn.textContent = 'Atualizar Pergunta';
  addBtn.onclick = () => {
    updateQuestion(index);
    addBtn.textContent = 'Adicionar/Atualizar';
    addBtn.onclick = addQuestion;
  };
}

function updateQuestion(index){
  const newQ = { text: qText.value, options: optInputs.map(i=>i.value), correct: parseInt(correctIndex.value) };
  quiz.questions[index] = newQ;
  renderQuestions();
  clearEditor();
}

function deleteQuestion(index){
  if(confirm('Tem certeza?')) {
    quiz.questions.splice(index, 1);
    renderQuestions();
  }
}

function addQuestion(){
  const newQ = { text: qText.value, options: optInputs.map(i=>i.value), correct: parseInt(correctIndex.value) };
  quiz.questions.push(newQ);
  renderQuestions();
  clearEditor();
}

function clearEditor(){
  qText.value = '';
  optInputs.forEach(i=>i.value='');
  correctIndex.value=0;
}

function renderParticipants(){
  participantList.innerHTML = Array.from(participants.values()).map(p=>`<li>${p.name} <span class="chip">${p.score} pts</span></li>`).join('');
  countParticipants.textContent = participants.size;
}

function startGame(){
  if(quiz.questions.length === 0) {
    alert('Adicione perguntas antes de iniciar.');
    return;
  }
  // Envia comando para todos os jogadores
  channel.postMessage({ type: 'GAME_START' });
  // Envia o primeiro slide para o presenter
  currentQIndex = 0;
  sendQuestionToPresenter(currentQIndex);
}

function nextQuestion(){
  currentQIndex++;
  if(currentQIndex < quiz.questions.length) {
    sendQuestionToPresenter(currentQIndex);
  } else {
    endGame();
  }
}

function endGame(){
  const leaderboard = getLeaderboard();
  channel.postMessage({ type: 'GAME_OVER', leaderboard });
  clearState();
}

function getLeaderboard(){
  const sorted = Array.from(participants.values()).sort((a,b)=>b.score-a.score);
  return sorted;
}

function sendQuestionToPresenter(index){
  const question = quiz.questions[index];
  if(!question) return;
  deadline = now() + QUESTION_TIME;
  // Manda a pergunta para todos os jogadores e presenter
  channel.postMessage({
    type: 'START_ROUND',
    qIndex: index,
    text: question.text,
    options: question.options,
    deadline
  });
  // Habilita/desabilita botões
  nextQuestionBtn.disabled = true;
  endGameBtn.disabled = false;
}

function revealAnswer(correctIndex){
  const leaderboard = getLeaderboard();
  channel.postMessage({
    type: 'ROUND_RESULT',
    correct: correctIndex,
    leaderboard
  });
  nextQuestionBtn.disabled = false;
}

function setupChannel(){
  const p = pinInput.value.trim();
  if(!p) return alert('PIN é obrigatório');
  if(channel) channel.close();
  pin = p;
  channel = new BroadcastChannel('quiz_'+pin);
  setConnected(true);

  channel.onmessage = (e) => {
    const msg = e.data;
    if(!msg || !msg.type) return;

    switch(msg.type){
      case 'JOIN':
        participants.set(msg.id, { id: msg.id, name: msg.name, score: 0 });
        renderParticipants();
        break;
      case 'ANSWER':
        if(currentQIndex === msg.qIndex && !answers.has(msg.id)) {
          answers.set(msg.id, { opt: msg.opt, ts: msg.ts });
          const correct = quiz.questions[msg.qIndex].correct;
          const participant = participants.get(msg.id);
          if (participant && msg.opt === correct) {
            const timeTaken = msg.ts - (deadline - QUESTION_TIME);
            const score = Math.max(0, 1000 - Math.floor(timeTaken / (QUESTION_TIME / 1000) * 100)); // Pontuação baseada no tempo
            participant.score += score;
          }
        }
        break;
      case 'PRES_START':
        startGame();
        break;
      case 'PRES_NEXT':
        nextQuestion();
        break;
      case 'PRES_PREV':
        alert("Comando 'voltar' recebido, mas a funcionalidade não está implementada no host.");
        break;
      case 'PRES_SHOW':
        if (currentQIndex >= 0 && currentQIndex < quiz.questions.length) {
          revealAnswer(quiz.questions[currentQIndex].correct);
        }
        break;
      case 'PRES_EXIT':
        endGame();
        break;
    }
  };
  // Sincroniza participantes existentes
  channel.postMessage({ type: 'LOBBY_STATE', participants: Array.from(participants.values()) });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  renderQuestions();
  if (typeof createBtn !== 'undefined' && createBtn) createBtn.onclick = setupChannel;
  if (typeof addBtn !== 'undefined' && addBtn) addBtn.onclick = addQuestion;
  if (typeof clearBtn !== 'undefined' && clearBtn) clearBtn.onclick = clearEditor;
  if (typeof downloadBtn !== 'undefined' && downloadBtn) {
    downloadBtn.onclick = () => downloadJSON('quiz.json', quiz);
  }
  if (typeof uploadInput !== 'undefined' && uploadInput) {
    uploadInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result);
          if (!obj.questions || !Array.isArray(obj.questions)) throw new Error('Formato inválido');
          quiz = obj;
          renderQuestions();
          alert('Quiz carregado com sucesso!');
        } catch (err) {
          alert('Erro ao carregar JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
  }
  if (typeof startGameBtn !== 'undefined' && startGameBtn) startGameBtn.onclick = startGame;
  if (typeof nextQuestionBtn !== 'undefined' && nextQuestionBtn) nextQuestionBtn.onclick = nextQuestion;
  if (typeof endGameBtn !== 'undefined' && endGameBtn) endGameBtn.onclick = endGame;
  if (typeof openPresenterBtn !== 'undefined' && openPresenterBtn) {
    openPresenterBtn.onclick = () => {
      if (!pinInput || !pinInput.value.trim()) {
        alert('Defina PIN e crie canal antes de abrir presenter.');
        return;
      }
      const w = window.open('presenter.html', '_blank');
      // Presenter currently uses a prompt to receive PIN; we still postMessage as a best-effort.
      setTimeout(() => w.postMessage({ presenter_pin: pin }, '*'), 500);
    };
  }
});

