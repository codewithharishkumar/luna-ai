
export const AudioService = {
  playUIEffect: (
    type:
      | "click"
      | "success"
      | "notification"
      | "locked"
  ) => {
    if (typeof window === "undefined") {
      return;
    }

    console.log(
      `[AudioService] Playing sound effect: ${type}`
    );
  },

  // HAPTIC FEEDBACK
  triggerHaptic: (
    intensity:
      | "light"
      | "medium"
      | "heavy"
  ) => {
    if (
      typeof window === "undefined" ||
      !navigator.vibrate
    ) {
      return;
    }

    try {
      if (intensity === "light") {
        navigator.vibrate(10);
      }

      if (intensity === "medium") {
        navigator.vibrate([
          15,
          30,
          15,
        ]);
      }

      if (intensity === "heavy") {
        navigator.vibrate([
          50,
          50,
          50,
        ]);
      }

      console.log(
        `[AudioService] Triggered ${intensity} haptic feedback`
      );
    } catch (e) {
      console.log(
        "Haptics not supported"
      );
    }
  },

  // VOICE PLACEHOLDER
  connectVoiceStream:
    async (
      characterId: string
    ) => {
      console.log(
        `[AudioService] Preparing voice stream for ${characterId}`
      );

      throw new Error(
        "Voice features require premium subscription and are currently in development."
      );
    },
};

