(function () {
  const VERIFY_API_URL =
    window.VPBOT_VERIFY_API_URL || "http://localhost:3000/api/verify";
  const QUESTIONS_FILE = "quiz_questions.json";

  function getPageId() {
    const path = window.location.pathname || "";
    const file = path.split("/").pop() || "index.html";
    return file.replace(/\.html?$/i, "");
  }

  function getQuestionsUrl() {
    const root =
      typeof window.path_to_root === "string" ? window.path_to_root : "";
    return root + QUESTIONS_FILE;
  }

  function addMessage(chatEl, role, text) {
    const msg = document.createElement("div");
    msg.className = `vpbot-msg ${role}`;
    msg.textContent = text;
    chatEl.appendChild(msg);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function setStatus(statusEl, text) {
    statusEl.textContent = text || "";
  }

  function setButtonsActive(buttons, activeIndex) {
    buttons.forEach((btn, idx) => {
      btn.classList.toggle("active", idx === activeIndex);
    });
  }

  async function verifyAnswer(payload) {
    const response = await fetch(VERIFY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Verify request failed: ${response.status}`);
    }

    return response.json();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    let questionsData = null;
    try {
      const response = await fetch(getQuestionsUrl(), { cache: "no-store" });
      if (response.ok) {
        questionsData = await response.json();
      }
    } catch (error) {
      questionsData = null;
    }

    const pageId = getPageId();
    const pageData = questionsData && questionsData[pageId];
    const questions =
      pageData && Array.isArray(pageData.questions) ? pageData.questions : [];

    const widget = document.createElement("div");
    widget.id = "vpbot-quiz";
    widget.innerHTML = `
      <div class="vpbot-header">
        <div class="vpbot-title">VPbot Quiz</div>
        <div class="vpbot-subtitle">Select a question to begin</div>
      </div>
      <div class="vpbot-body">
        <div class="vpbot-questions"></div>
        <div class="vpbot-chat"></div>
      </div>
      <form class="vpbot-input" autocomplete="off">
        <input type="text" name="answer" placeholder="Type your answer..." />
        <button type="button" class="vpbot-mic-btn" aria-label="Toggle voice input">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </button>
        <button type="submit">Send</button>
      </form>
      <div class="vpbot-status"></div>
    `;

    document.body.appendChild(widget);

    const questionContainer = widget.querySelector(".vpbot-questions");
    const chatEl = widget.querySelector(".vpbot-chat");
    const form = widget.querySelector(".vpbot-input");
    const input = form.querySelector("input");
    const micButton = form.querySelector(".vpbot-mic-btn");
    const statusEl = widget.querySelector(".vpbot-status");
    const subtitleEl = widget.querySelector(".vpbot-subtitle");

    let currentQuestion = null;
    let isBusy = false;
    let isListening = false;
    let recognition = null;
    let lastTranscript = "";

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const supportsSpeech = typeof SpeechRecognition === "function";

    if (!questions.length) {
      addMessage(chatEl, "bot", "No quiz questions for this page yet.");
      form.classList.add("disabled");
      input.disabled = true;
      form.querySelector("button").disabled = true;
      return;
    }

    input.disabled = true;
    form.querySelector("button").disabled = true;
    micButton.disabled = !supportsSpeech;

    const buttons = questions.map((question, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vpbot-question-btn";
      btn.textContent = question.prompt;
      btn.addEventListener("click", () => {
        if (isBusy) {
          return;
        }
        currentQuestion = question;
        setButtonsActive(buttons, index);
        input.disabled = false;
        form.querySelector("button").disabled = false;
        micButton.disabled = !supportsSpeech;
        input.focus();
      });
      questionContainer.appendChild(btn);
      return btn;
    });

    if (subtitleEl) {
      subtitleEl.textContent = "Select a question, then enter your answer.";
    }
    chatEl.textContent = "";

    function setMicState(listening) {
      isListening = listening;
      micButton.classList.toggle("listening", listening);
    }

    async function sendAnswer(userAnswer) {
      if (isBusy) {
        return;
      }
      const trimmed = String(userAnswer || "").trim();
      if (!trimmed || !currentQuestion) {
        return;
      }

      addMessage(chatEl, "user", trimmed);
      input.value = "";

      isBusy = true;
      input.disabled = true;
      form.querySelector("button").disabled = true;
      micButton.disabled = true;
      setStatus(statusEl, "Checking answer...");

      try {
        const payload = {
          question: currentQuestion.prompt,
          answer_key: currentQuestion.answer,
          required_points: currentQuestion.required_points || [],
          user_answer: trimmed,
          page_id: pageId,
        };
        const result = await verifyAnswer(payload);
        const verdict =
          typeof result.verdict === "string" ? result.verdict : "INCORRECT";
        const feedback =
          typeof result.feedback === "string" && result.feedback.trim()
            ? ` ${result.feedback.trim()}`
            : "";
        if (verdict === "CORRECT") {
          addMessage(chatEl, "bot", `Correct.${feedback}`);
        } else {
          addMessage(chatEl, "bot", `Incorrect.${feedback}`);
          if (result.correct_answer) {
            addMessage(
              chatEl,
              "bot",
              `Correct answer: ${result.correct_answer}`
            );
          }
        }
      } catch (error) {
        addMessage(
          chatEl,
          "bot",
          "Unable to verify right now. Check the server and try again."
        );
      } finally {
        isBusy = false;
        input.disabled = false;
        form.querySelector("button").disabled = false;
      micButton.disabled = !supportsSpeech;
      setStatus(statusEl, "");
      input.focus();
    }
    }

    if (supportsSpeech) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.addEventListener("start", () => {
        lastTranscript = "";
        setStatus(statusEl, "Listening...");
        setMicState(true);
      });

      recognition.addEventListener("result", (event) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interim += transcript;
          }
        }
        lastTranscript = (finalText || interim).trim();
        input.value = lastTranscript;
      });

      recognition.addEventListener("end", () => {
        setMicState(false);
        setStatus(statusEl, "");
        if (lastTranscript) {
          sendAnswer(lastTranscript);
        }
      });

      recognition.addEventListener("error", () => {
        setMicState(false);
        setStatus(statusEl, "Mic unavailable. You can type instead.");
      });
    } else {
      setStatus(statusEl, "Voice input not supported. Use the keyboard.");
      input.disabled = false;
      form.querySelector("button").disabled = false;
    }

    micButton.addEventListener("click", () => {
      if (!supportsSpeech || !currentQuestion || isBusy) {
        return;
      }
      if (!recognition) {
        return;
      }
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentQuestion) {
        addMessage(chatEl, "bot", "Pick a question before answering.");
        return;
      }
      const userAnswer = input.value.trim();
      sendAnswer(userAnswer);
    });
  });
})();
