import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const COLORS = {
  bg: "#0E1012",
  panel: "#15191D",
  panel2: "#0F1316",
  text: "#E6E6E6",
  muted: "#9AA4AF",
  neon: "#39FF14",
  neonDark: "#1B7F0B",
  danger: "#FF3B3B",
};

function PillButton({ label, onPress, variant = "panel", disabled = false }) {
  const style = useMemo(() => {
    if (variant === "neon") {
      return {
        backgroundColor: disabled ? "#123a0d" : COLORS.neonDark,
        borderColor: disabled ? "#123a0d" : COLORS.neon,
      };
    }
    if (variant === "danger") {
      return { backgroundColor: "#2A1212", borderColor: COLORS.danger };
    }
    return { backgroundColor: COLORS.panel2, borderColor: "#1D242A" };
  }, [variant, disabled]);

  const textStyle = useMemo(() => {
    if (variant === "neon") return { color: "#061006" };
    return { color: COLORS.text };
  }, [variant]);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        style,
        pressed && !disabled ? { opacity: 0.85 } : null,
        disabled ? { opacity: 0.55 } : null,
      ]}
    >
      <Text style={[styles.btnText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

function WelcomeScreen({ onContinue }) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.welcomeWrap}>
        <View style={styles.brandRow}>
          <View style={styles.neonDot} />
          <Text style={styles.brand}>Miguel Player</Text>
        </View>

        <Text style={styles.welcomeTitle}>
          Bienvenido, Miguel.{"\n"}Tu música, tus reglas.
        </Text>
        <Text style={styles.welcomeSub}>
          Reproduce archivos locales del celular. Sin streaming. Sin gasto de
          datos.
        </Text>

        <View style={{ height: 18 }} />
        <PillButton label="ENTRAR" variant="neon" onPress={onContinue} />

        <View style={{ height: 14 }} />
        <Text style={styles.footerNote}>
          Tip: En Samsung, el selector te deja elegir desde Descargas o tu
          carpeta de música.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function PlayerScreen({ onBack }) {
  const soundRef = useRef(null);
  const statusTimerRef = useRef(null);

  const [picked, setPicked] = useState(null); // { uri, name }
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const canPlay = Boolean(picked?.uri) && isLoaded;

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
      (async () => {
        try {
          if (soundRef.current) await soundRef.current.unloadAsync();
        } catch (_e) {}
        soundRef.current = null;
      })();
    };
  }, []);

  const fmt = (ms) => {
    const s = Math.max(0, Math.floor((ms || 0) / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  const syncStatus = async () => {
    try {
      const s = soundRef.current;
      if (!s) return;
      const st = await s.getStatusAsync();
      if (!st?.isLoaded) return;
      setIsLoaded(true);
      setIsPlaying(Boolean(st.isPlaying));
      setPositionMs(st.positionMillis ?? 0);
      setDurationMs(st.durationMillis ?? 0);
    } catch (_e) {}
  };

  const ensureTimer = () => {
    if (statusTimerRef.current) return;
    statusTimerRef.current = setInterval(() => {
      syncStatus();
    }, 250);
  };

  const pickAudio = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        multiple: false,
        copyToCacheDirectory: false,
      });

      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;

      setPicked({ uri: asset.uri, name: asset.name || "Audio local" });
      setIsLoaded(false);
      setIsPlaying(false);
      setPositionMs(0);
      setDurationMs(0);

      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch (_e) {}
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: asset.uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 250 },
        (st) => {
          if (!st?.isLoaded) return;
          setIsLoaded(true);
          setIsPlaying(Boolean(st.isPlaying));
          setPositionMs(st.positionMillis ?? 0);
          setDurationMs(st.durationMillis ?? 0);
          if (st.didJustFinish) setIsPlaying(false);
        }
      );

      soundRef.current = sound;
      setIsLoaded(Boolean(status?.isLoaded));
      ensureTimer();
    } catch (e) {
      Alert.alert("No se pudo abrir el audio", String(e?.message || e));
    }
  };

  const play = async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.playAsync();
      ensureTimer();
      await syncStatus();
    } catch (e) {
      Alert.alert("Error al reproducir", String(e?.message || e));
    }
  };

  const pause = async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.pauseAsync();
      await syncStatus();
    } catch (e) {
      Alert.alert("Error al pausar", String(e?.message || e));
    }
  };

  const stop = async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
      await syncStatus();
    } catch (e) {
      Alert.alert("Error al detener", String(e?.message || e));
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!picked) return "Elige un archivo local (.mp3/.m4a/.wav)";
    return picked.name;
  }, [picked]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>⟨</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Miguel Player</Text>
          <Text style={styles.sub}>{headerSubtitle}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {Platform.OS === "android" ? "SAMSUNG" : "LOCAL"}
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.rowBetween}>
          <Text style={styles.kicker}>Fuente</Text>
          <Text style={styles.kickerValue}>Archivos locales</Text>
        </View>

        <View style={{ height: 12 }} />
        <PillButton label="SELECCIONAR AUDIO" variant="neon" onPress={pickAudio} />

        <View style={{ height: 16 }} />
        <View style={styles.rowBetween}>
          <Text style={styles.time}>{fmt(positionMs)}</Text>
          <Text style={styles.timeMuted}>{fmt(durationMs)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  durationMs > 0
                    ? `${Math.min(100, (positionMs / durationMs) * 100)}%`
                    : "0%",
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.controls}>
        <PillButton
          label="PLAY"
          variant="panel"
          onPress={play}
          disabled={!canPlay || isPlaying}
        />
        <PillButton
          label="PAUSE"
          variant="panel"
          onPress={pause}
          disabled={!canPlay || !isPlaying}
        />
        <PillButton
          label="STOP"
          variant="danger"
          onPress={stop}
          disabled={!canPlay}
        />
      </View>

      <Text style={styles.note}>
        {picked
          ? "Reproducción local activa. Cero streaming."
          : "Selecciona un archivo para comenzar."}
      </Text>
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState("welcome");
  return screen === "welcome" ? (
    <WelcomeScreen onContinue={() => setScreen("player")} />
  ) : (
    <PlayerScreen onBack={() => setScreen("welcome")} />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  welcomeWrap: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 34,
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  neonDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  brand: {
    color: COLORS.text,
    fontSize: 16,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  welcomeTitle: {
    color: COLORS.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 8,
  },
  welcomeSub: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 420,
  },
  footerNote: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 520,
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: "#1D242A",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  h1: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  sub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: COLORS.neonDark,
  },
  badgeText: {
    color: COLORS.neon,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.2,
  },

  panel: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: "#1D242A",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: { color: COLORS.muted, fontSize: 12, letterSpacing: 1.2 },
  kickerValue: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  time: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  timeMuted: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.panel2,
    overflow: "hidden",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#1D242A",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.neonDark,
    borderRightWidth: 1,
    borderRightColor: COLORS.neon,
  },

  controls: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },

  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontWeight: "900",
    letterSpacing: 1.2,
    fontSize: 12,
  },

  note: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 14,
  },
});
