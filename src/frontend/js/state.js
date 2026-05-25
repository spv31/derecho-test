export const state = {
  token: localStorage.getItem('session_token'),
  userEmail: localStorage.getItem('user_email') || '',
  currentSubjectId: null,
  currentSubjectName: null,
  currentExamId: null,
  examQuestions: [],
  userAnswers: [],
  currentSummaryId: null,
  subjects: [],
};