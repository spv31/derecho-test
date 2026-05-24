import { state } from '../state.js?v=4';
import { $, escapeHtml, showLoading, showToast } from '../utils.js?v=4';
import { getExam } from '../api.js?v=4';

export async function showExam(examId) {
  state.currentExamId = examId;
  showLoading(true);
  const exam = await getExam(examId);
  showLoading(false);
  if (!exam) {
    window.dispatchEvent(new CustomEvent('nav:subject', {
      detail: { subjectId: state.currentSubjectId, subjectName: state.currentSubjectName },
    }));
    return;
  }
  state.examQuestions = exam.questions || [];
  state.userAnswers = state.examQuestions.map(() => null);
  renderExam(exam);
}

function renderExam(exam) {
  const title = exam.title || 'Examen';
  const meta = `${exam.questions.length} preguntas · ${new Date(exam.created_at).toLocaleDateString()}`;

  let questionsHtml = '';
  exam.questions.forEach((q, i) => {
    let optionsHtml = '';
    (q.options || []).forEach((opt, j) => {
      optionsHtml += `
        <label class="flex items-center gap-3 p-2 rounded-md hover:bg-brand-bg/50 cursor-pointer transition-colors">
          <input type="radio" name="q-${i}" value="${j}" class="rounded-full border-brand-border bg-brand-bg text-brand-accent focus:ring-brand-accent" data-q="${i}" />
          <span class="text-sm">${escapeHtml(opt)}</span>
        </label>
      `;
    });
    questionsHtml += `
      <div class="bg-brand-surface border border-brand-border rounded-lg p-4" id="question-${i}">
        <p class="text-sm font-medium mb-3">${i + 1}. ${escapeHtml(q.question)}</p>
        <div class="space-y-1">${optionsHtml}</div>
        <div id="q-${i}-result" class="hidden mt-3"></div>
      </div>
    `;
  });

  $('#main-content').innerHTML = `
    <div class="max-w-3xl">
      <div class="flex items-center gap-3 mb-6">
        <button data-nav="back-to-subject" class="text-brand-muted hover:text-brand-text transition-colors" title="Volver">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 class="font-display text-lg font-semibold text-brand-text">${escapeHtml(title)}</h2>
          <p class="text-xs text-brand-muted">${meta}</p>
        </div>
      </div>

      <div id="questions-container" class="space-y-6 mb-6">${questionsHtml}</div>

      <div id="exam-actions" class="flex gap-3 items-center">
        <button id="submit-exam-btn" class="bg-brand-accent hover:bg-brand-accent-h text-white text-sm px-6 py-2.5 rounded-lg transition-colors">Corregir examen</button>
      </div>

      <div id="exam-results" class="hidden mt-6 bg-brand-surface border border-brand-border rounded-lg p-6">
        <h3 class="font-display text-lg text-brand-accent mb-2" id="results-score"></h3>
        <p class="text-xs text-brand-muted mb-4" id="results-detail"></p>
      </div>
    </div>
  `;

  $('#questions-container').querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const qi = parseInt(input.dataset.q);
      state.userAnswers[qi] = parseInt(input.value);
    });
  });

  $('#submit-exam-btn').addEventListener('click', submitExam);
}

function submitExam() {
  const questions = state.examQuestions;
  let correct = 0;
  questions.forEach((q, i) => {
    const resultDiv = document.querySelector(`#q-${i}-result`);
    const selected = state.userAnswers[i];
    const isCorrect = selected === q.correct_index;
    if (isCorrect) correct++;

    resultDiv.classList.remove('hidden');
    const options = document.querySelectorAll(`#question-${i} input[type="radio"]`);
    options.forEach((opt, j) => {
      const label = opt.closest('label');
      if (j === q.correct_index) {
        label.classList.add('text-emerald-400', 'bg-emerald-900/20');
        label.classList.remove('hover:bg-brand-bg/50');
      } else if (j === selected && !isCorrect) {
        label.classList.add('text-brand-error', 'bg-red-900/20');
        label.classList.remove('hover:bg-brand-bg/50');
      } else {
        label.classList.add('opacity-50');
      }
      opt.disabled = true;
    });

    resultDiv.innerHTML = `
      <div class="text-xs ${isCorrect ? 'text-emerald-400' : 'text-brand-error'} mb-1">
        ${isCorrect ? '&#10003; Correcto' : `&#10007; Incorrecto (correcta: ${escapeHtml(q.options[q.correct_index])})`}
      </div>
      <div class="text-xs text-brand-muted">${escapeHtml(q.explanation || '')}</div>
    `;
  });

  const total = questions.length;
  $('#results-score').textContent = `${correct} / ${total}`;
  $('#results-detail').textContent = `${Math.round((correct / total) * 100)}% de aciertos`;
  $('#exam-results').classList.remove('hidden');
  $('#submit-exam-btn').classList.add('hidden');
}