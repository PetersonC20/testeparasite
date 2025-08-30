let channel = null; let pin = null; let myId = Math.random().toString(36).slice(2,9); let myName = localStorage.getItem('quiz_name') || ''; let joined = false; let current = null; let myScore = 0;

const nickname = byId('nickname'); const pinInput = byId('pin'); const joinBtn = byId('join'); const statusEl = byId('status'); const gameArea = byId('game-area'); const gameTitle = byId('game-title'); const countdownEl = byId('countdown'); const questionEl = byId('question'); const optionsEl = byId('options'); const feedbackEl = byId('feedback'); const scoreEl = byId('score');

nickname.value = myName;

function connect(){ const name = nickname.value.trim(); const code = pinInput.value.trim(); if(!name||!code){ alert('Preencha apelido e PIN.'); return; } myName=name; pin=code; localStorage.setItem('quiz_name', myName); if(channel) channel.close(); channel = new BroadcastChannel('quiz_'+pin); channel.onmessage = onMessage; statusEl.textContent='Conectado. Aguardando na sala...'; joined=true; gameArea.classList.remove('hidden'); channel.postMessage({type:'JOIN', id: myId, name: myName, ts: Date.now()}); }

function onMessage(ev){ const msg = ev.data; if(!msg||!msg.type) return; switch(msg.type){ case 'LOBBY_STATE': break; case 'GAME_START': myScore=0; scoreEl.textContent=`Pontuação: ${myScore}`; scoreEl.classList.remove('hidden'); break; case 'START_ROUND': showQuestion(msg); break; case 'ROUND_RESULT': showRoundResult(msg); break; case 'GAME_OVER': showGameOver(msg); break; default: break; } }

let countdownInterval = null;
function showQuestion(msg){
  gameTitle.textContent = `Pergunta ${msg.qIndex+1} / ${msg.questionsCount||''}`;
  questionEl.textContent = msg.text;
  optionsEl.innerHTML = '';
  optionsEl.dataset.qIndex = msg.qIndex;
  optionsEl.style.pointerEvents = 'auto'; // Habilita cliques
  (msg.options||[]).forEach((o,i)=>{
    const el = document.createElement('div');
    el.className = 'option';
    el.innerHTML = `<strong>${String.fromCharCode(65+i)}</strong>. ${o}`;
    el.dataset.index = i;
    el.onclick = ()=>sendAnswer(msg.qIndex, i, Date.now());
    optionsEl.appendChild(el);
  });
  feedbackEl.textContent = '';
  countdownEl.classList.remove('hidden');
  stopCountdown();
  countdown(msg.deadline);
}

function sendAnswer(qIndex, opt, ts){
  if(!channel || !joined) return;
  channel.postMessage({ type: 'ANSWER', id: myId, qIndex, opt, ts });
  feedbackEl.textContent = `Sua resposta: ${String.fromCharCode(65+opt)}`;
  optionsEl.style.pointerEvents = 'none'; // Desabilita cliques após resposta
}

function countdown(deadline){
  const updateTimer = ()=>{
    const remaining = Math.max(0, deadline - now());
    countdownEl.textContent = Math.floor(remaining/1000);
    if(remaining <= 0) stopCountdown();
  };
  updateTimer();
  countdownInterval = setInterval(updateTimer, 500);
}

function stopCountdown(){ if(countdownInterval) clearInterval(countdownInterval); }

function showRoundResult(msg){
  stopCountdown();
  countdownEl.classList.add('hidden');
  if (msg.correct != null) {
    Array.from(optionsEl.children).forEach(el => {
      const isCorrect = Number(el.dataset.index) === msg.correct;
      el.classList.add(isCorrect ? 'correct' : 'wrong');
      el.style.transition = 'transform 0.5s ease-out, background 0.5s ease-out, box-shadow 0.5s ease-out';
      if (isCorrect) {
        el.classList.add('opt-bounce');
      }
    });
  }
  const myRank = msg.leaderboard.findIndex(p=>p.id===myId);
  const myData = msg.leaderboard.find(p=>p.id===myId);
  if(myData) myScore = myData.score;
  scoreEl.textContent = `Pontuação: ${myScore} | Rank: ${myRank>=0 ? myRank+1 : '-'}`;
  gameTitle.textContent = `Próxima pergunta em breve...`;
}

function showGameOver(msg){
  const lb = msg.leaderboard||[]; const top = lb[0];
  if(!top){ gameTitle.textContent='Jogo encerrado.'; feedbackEl.textContent=''; return; }
  if(top.id===myId){ gameTitle.textContent='🏆 Você venceu! Parabéns!'; }else gameTitle.textContent = `Fim de jogo — Vencedor: ${top.name} (${top.score} pts)`;
  // show podium
  const podium = document.createElement('div'); podium.className='card'; podium.style.marginTop='12px'; podium.innerHTML = '<h3>Pódio</h3>'; const podiumList = document.createElement('div'); podiumList.style.display='flex'; podiumList.style.gap='8px'; podiumList.style.alignItems='end'; podiumList.style.justifyContent='center'; const top3 = lb.slice(0,3); top3.forEach((p,idx)=>{ const pbox = document.createElement('div'); pbox.style.width = (idx===0?160:120)+'px'; pbox.style.height = (idx===0?220:160)+'px'; pbox.style.background = 'rgba(255,255,255,0.03)'; pbox.style.border = '1px solid rgba(255,255,255,0.04)'; pbox.style.borderRadius='8px'; pbox.style.display='flex'; pbox.style.flexDirection='column'; pbox.style.alignItems='center'; pbox.style.justifyContent='center'; pbox.innerHTML = `<h4>#${idx+1}</h4><p>${p.name}</p><h5>${p.score}</h5>`; podiumList.appendChild(pbox); }); podium.appendChild(podiumList); gameArea.appendChild(podium);
  optionsEl.innerHTML = '';
  feedbackEl.textContent = 'Obrigado por jogar!';
}
joinBtn.onclick = connect;
pinInput.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') connect(); });
