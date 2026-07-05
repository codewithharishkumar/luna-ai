import { supabaseClient } from "@/lib/supabase-client";

type VoiceState =
  | "connecting"
  | "connected"
  | "listening"
  | "processing"
  | "speaking"
  | "disconnected"
  | "error";

class WebRTCService {
  private isConnected = false;
  private currentState: VoiceState = "disconnected";
  private recognition: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private characterId = "Luna";
  private restartTimeout: any = null;

  public onStateChange?: (state: VoiceState) => void;

  private setState(state: VoiceState) {
    this.currentState = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  // START CALL
  public async initializeCall(characterId: string): Promise<boolean> {
    try {
      this.characterId = characterId;
      this.setState("connecting");

      console.log(`[Voice] Initializing call with ${characterId}`);

      // Request microphone permission and capture stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Instantiating speech recognition ONLY ONCE per call lifecycle
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.error("Speech Recognition not supported in this browser.");
        this.setState("error");
        return false;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = "en-US";
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        console.log("[VOICE] Speech recognition started");
      };

      this.recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("[VOICE] Transcript:", transcript);

        // Pause recognition by calling stop() and transition to processing
        this.pauseRecognitionAndTransition("processing");

        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          const userId = user?.id || localStorage.getItem("userId");

          if (!userId) {
            console.error("[VOICE] No user ID found.");
            this.setState("error");
            return;
          }

          const response = await fetch("/api/voice", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transcript,
              character: this.characterId,
              userId,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[VOICE] API Error (${response.status}):`, errorText);
            this.startListening();
            return;
          }

          const data = await response.json();
          console.log("[VOICE] AI Response:", data);

          if (data.audioUrl) {
            this.setState("speaking");

            if (this.currentAudio) {
              this.currentAudio.pause();
            }

            const audio = new Audio(data.audioUrl);
            this.currentAudio = audio;

            audio.onended = () => {
              this.currentAudio = null;
              // Resume recognition after 300ms when audio finishes
              if (this.isConnected) {
                setTimeout(() => {
                  this.startListening();
                }, 300);
              }
            };

            audio.onerror = (err) => {
              console.error("[VOICE] Audio playback error:", err);
              this.fallbackToBrowserTTS(data.reply);
            };

            try {
              await audio.play();
            } catch (playError) {
              console.warn("[VOICE] Autoplay prevented or playback failed. Using TTS fallback.", playError);
              this.fallbackToBrowserTTS(data.reply);
            }
          } else if (data.reply) {
            console.warn("[VOICE] No audioUrl returned from API. Using TTS fallback.");
            this.fallbackToBrowserTTS(data.reply);
          } else {
            // No audio and no reply returned, resume listening immediately
            this.startListening();
          }
        } catch (apiError) {
          console.error("[VOICE] Network / Processing Error:", apiError);
          // Resume listening instead of freezing the call on network drops
          this.startListening();
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn("[VOICE ERROR EVENT]", event.error);
        
        const fatalErrors = ["not-allowed", "service-not-allowed", "audio-capture"];
        if (fatalErrors.includes(event.error)) {
          this.setState("error");
        } else {
          // Do not treat 'no-speech' or 'aborted' as fatal
          console.log(`[VOICE] Ignored non-fatal error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        console.log("[VOICE] Speech recognition ended");
        // Schedule restart after 300ms if call is active and still listening
        if (this.currentState === "listening" && this.isConnected) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.currentState === "listening" && this.isConnected) {
              try {
                this.recognition.start();
              } catch (e) {
                // Already started
              }
            }
          }, 300);
        }
      };

      this.isConnected = true;
      this.setState("connected");
      console.log("[Voice] Connected");
      return true;
    } catch (error) {
      console.error("[Voice Error during initialization]", error);
      this.setState("error");
      return false;
    }
  }

  // FALLBACK TO BROWSER TTS
  private fallbackToBrowserTTS(text: string) {
    if (!text) {
      this.startListening();
      return;
    }

    this.setState("speaking");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1.2;
    utterance.rate = 1.0;

    utterance.onend = () => {
      if (this.isConnected) {
        setTimeout(() => {
          this.startListening();
        }, 300);
      }
    };

    utterance.onerror = (err) => {
      console.error("[VOICE] SpeechSynthesis error:", err);
      this.startListening();
    };

    window.speechSynthesis.speak(utterance);
  }

  // START LISTENING
  public startListening() {
    if (!this.isConnected || !this.recognition) {
      return;
    }

    this.setState("listening");
    try {
      this.recognition.start();
    } catch (e) {
      // Already running
    }
  }

  // STOP LISTENING
  public stopListening() {
    this.pauseRecognitionAndTransition("connected");
  }

  // PAUSE RECOGNITION AND TRANSITION STATE
  private pauseRecognitionAndTransition(targetState: VoiceState) {
    this.setState(targetState);
    if (this.recognition) {
      try {
        this.recognition.stop(); // stop() is safe and non-fatal
      } catch (e) {
        // Already stopped
      }
    }
  }

  // EMOTION MODULATION
  public modulateVoiceEmotion(affectionLevel: number, currentEmotion: string) {
    console.log(`[Voice Emotion] ${currentEmotion} | ${affectionLevel}`);
  }

  // END CALL
  public async terminateCall(): Promise<void> {
    try {
      this.isConnected = false;
      this.setState("disconnected");

      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }

      if (this.recognition) {
        try {
          this.recognition.abort(); // Use abort strictly when terminating call
        } catch (e) {}
        this.recognition = null;
      }

      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
        } catch (e) {}
        this.currentAudio = null;
      }

      window.speechSynthesis.cancel();

      // Stop all tracks associated with MediaStream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      console.log("[Voice] Call terminated");
    } catch (error) {
      console.error("[Voice Termination Error]", error);
    }
  }
}

export const voiceClient = new WebRTCService();