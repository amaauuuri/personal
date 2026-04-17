import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  StatusBar as RNStatusBar,
  Text,
  FlatList,
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

function ActionChip({ label, onPress, variant = "panel" }) {
  const isNeon = variant === "neon";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isNeon ? styles.chipNeon : styles.chipPanel,
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <Text style={[styles.chipText, isNeon ? styles.chipTextNeon : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function IconControl({ label, onPress, variant = "panel", disabled = false }) {
  const isNeon = variant === "neon";
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.ctrlBtn,
        isNeon ? styles.ctrlBtnNeon : styles.ctrlBtnPanel,
        pressed && !disabled ? { transform: [{ scale: 0.98 }] } : null,
        disabled ? { opacity: 0.45 } : null,
      ]}
    >
      <Text style={[styles.ctrlText, isNeon ? styles.ctrlTextNeon : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlayerScreen() {
  const soundRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const [tracks, setTracks] = useState([]); // [{ uri, name }]
  const [currentIndex, setCurrentIndex] = useState(-1);

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;
  const canPlay = Boolean(currentTrack?.uri) && isLoaded;

  useEffect(() => {
    return () => {
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

  const attachSound = async (uri) => {
    try {
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

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 250 },
        (st) => {
          if (!st?.isLoaded) return;
          setIsLoaded(true);
          setIsPlaying(Boolean(st.isPlaying));
          setPositionMs(st.positionMillis ?? 0);
          setDurationMs(st.durationMillis ?? 0);
          if (st.didJustFinish) {
            setIsPlaying(false);
            setPositionMs(st.durationMillis ?? 0);
          }
        }
      );

      soundRef.current = sound;
    } catch (e) {
      Alert.alert("No se pudo cargar el audio", String(e?.message || e));
    }
  };

  const pickMp3Files = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const assets = (res.assets || [])
        .filter((a) => a?.uri)
        .filter((a) => (a?.name || "").toLowerCase().endsWith(".mp3"));

      if (assets.length === 0) {
        Alert.alert("Sin MP3", "Selecciona uno o más archivos .mp3.");
        return;
      }

      const incoming = assets.map((a) => ({
        uri: a.uri,
        name: a.name || "audio.mp3",
      }));

      setTracks((prev) => {
        const next = [...prev, ...incoming];
        return next;
      });

      if (currentIndex === -1) {
        setCurrentIndex(0);
        await attachSound(incoming[0].uri);
      }
    } catch (e) {
      Alert.alert("No se pudo abrir el audio", String(e?.message || e));
    }
  };

  const pickFolderMp3 = async () => {
    try {
      if (!FileSystem?.StorageAccessFramework?.requestDirectoryPermissionsAsync) {
        Alert.alert(
          "No disponible",
          "El selector de carpetas está disponible en Android con SAF."
        );
        return;
      }

      const perm =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm?.granted || !perm?.directoryUri) return;

      const entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        perm.directoryUri
      );

      const mp3Uris = (entries || []).filter((u) =>
        String(u).toLowerCase().endsWith(".mp3")
      );

      if (mp3Uris.length === 0) {
        Alert.alert("Sin MP3", "No encontré .mp3 en esa carpeta.");
        return;
      }

      const incoming = mp3Uris.map((uri) => {
        const parts = String(uri).split("/");
        const name = decodeURIComponent(parts[parts.length - 1] || "audio.mp3");
        return { uri, name };
      });

      setTracks((prev) => [...prev, ...incoming]);

      if (currentIndex === -1) {
        setCurrentIndex(0);
        await attachSound(incoming[0].uri);
      }
    } catch (e) {
      Alert.alert("No se pudo leer la carpeta", String(e?.message || e));
    }
  };

  const play = async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.playAsync();
    } catch (e) {
      Alert.alert("Error al reproducir", String(e?.message || e));
    }
  };

  const pause = async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.pauseAsync();
    } catch (e) {
      Alert.alert("Error al pausar", String(e?.message || e));
    }
  };

  const togglePlayPause = async () => {
    if (!canPlay) return;
    if (isPlaying) await pause();
    else await play();
  };

  const stop = async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
    } catch (e) {
      Alert.alert("Error al detener", String(e?.message || e));
    }
  };

  const openTrack = async (index) => {
    const t = tracks[index];
    if (!t?.uri) return;
    setCurrentIndex(index);
    await attachSound(t.uri);
    await play();
  };

  const prev = async () => {
    if (tracks.length === 0) return;
    const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
    await openTrack(nextIndex);
  };

  const next = async () => {
    if (tracks.length === 0) return;
    const nextIndex =
      currentIndex < 0
        ? 0
        : Math.min(tracks.length - 1, currentIndex + 1);
    await openTrack(nextIndex);
  };

  const headerSubtitle = useMemo(() => {
    if (!tracks.length) return "Selecciona MP3 locales (archivos o carpeta)";
    return `${tracks.length} canciones • ${
      currentTrack?.name || "Sin selección"
    }`;
  }, [tracks.length, currentTrack?.name]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" translucent={false} backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.neonDot} />
          <Text style={styles.brand}>Miguel Player</Text>
        </View>
        <Text style={styles.welcomeLine}>
          Bienvenido, Miguel{" "}
          <Text style={styles.welcomeLineNeon}></Text>
        </Text>
        <Text style={styles.sub}>{headerSubtitle}</Text>

        <View style={styles.chipRow}>
          <ActionChip label="Elegir MP3" variant="neon" onPress={pickMp3Files} />
          <ActionChip label="Elegir carpeta" onPress={pickFolderMp3} />
          <ActionChip
            label="Limpiar lista"
            onPress={async () => {
              setTracks([]);
              setCurrentIndex(-1);
              setIsLoaded(false);
              setIsPlaying(false);
              setPositionMs(0);
              setDurationMs(0);
              try {
                if (soundRef.current) await soundRef.current.unloadAsync();
              } catch (_e) {}
              soundRef.current = null;
            }}
          />
        </View>
      </View>

      <View style={styles.listWrap}>
        <FlatList
          data={tracks}
          keyExtractor={(item, idx) => `${idx}:${item.uri}`}
          contentContainerStyle={{
            paddingBottom: 120,
            paddingTop: 10,
          }}
          renderItem={({ item, index }) => {
            const active = index === currentIndex;
            return (
              <Pressable
                onPress={() => openTrack(index)}
                style={({ pressed }) => [
                  styles.trackRow,
                  active ? styles.trackRowActive : null,
                  pressed ? { opacity: 0.9 } : null,
                ]}
              >
                <View style={styles.trackLeft}>
                  <View
                    style={[
                      styles.trackIndicator,
                      active ? styles.trackIndicatorActive : null,
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.trackTitle, active ? styles.trackTitleActive : null]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.trackMeta} numberOfLines={1}>
                      Local • .mp3
                    </Text>
                  </View>
                </View>
                <Text style={styles.trackAction}>{active ? (isPlaying ? "▮▮" : "▶") : "▶"}</Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Tu música, tus reglas.</Text>
              <Text style={styles.emptySub}>
                Elige archivos .mp3 o una carpeta. La lista aparece aquí.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </View>

      <View style={styles.miniPlayer}>
        <View style={styles.miniTop}>
          <Text style={styles.miniTitle} numberOfLines={1}>
            {currentTrack?.name || "Sin canción seleccionada"}
          </Text>
          <Text style={styles.miniTime}>
            {fmt(positionMs)} / {fmt(durationMs)}
          </Text>
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
        <View style={styles.miniControls}>
          <IconControl label="⏮" onPress={prev} disabled={tracks.length === 0 || currentIndex <= 0} />
          <IconControl
            label={isPlaying ? "⏸" : "▶"}
            variant="neon"
            onPress={togglePlayPause}
            disabled={!canPlay}
          />
          <IconControl
            label="⏭"
            onPress={next}
            disabled={tracks.length === 0 || currentIndex >= tracks.length - 1}
          />
          <IconControl label="⏹" variant="panel" onPress={stop} disabled={!canPlay} />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return <PlayerScreen />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
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
    fontSize: 13,
    letterSpacing: 2.0,
    textTransform: "uppercase",
  },
  welcomeLine: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  welcomeLineNeon: {
    color: COLORS.neon,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  sub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPanel: { backgroundColor: COLORS.panel2, borderColor: "#1D242A" },
  chipNeon: { backgroundColor: COLORS.neonDark, borderColor: COLORS.neon },
  chipText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, color: COLORS.text },
  chipTextNeon: { color: "#061006" },

  listWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  trackRow: {
    backgroundColor: COLORS.panel,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#1D242A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackRowActive: {
    borderColor: COLORS.neonDark,
    shadowColor: COLORS.neon,
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  trackLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  trackIndicator: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#2A333B",
  },
  trackIndicatorActive: { backgroundColor: COLORS.neon },
  trackTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  trackTitleActive: { color: COLORS.neon },
  trackMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  trackAction: { color: COLORS.muted, fontSize: 14, fontWeight: "900", marginLeft: 12 },

  empty: {
    paddingTop: 36,
    paddingHorizontal: 10,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  emptySub: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 520 },

  miniPlayer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1D242A",
  },
  miniTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  miniTitle: { flex: 1, color: COLORS.text, fontSize: 12, fontWeight: "900" },
  miniTime: { color: COLORS.muted, fontSize: 11, fontWeight: "800" },
  progressTrack: {
    height: 8,
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
  miniControls: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlBtnPanel: { backgroundColor: COLORS.panel2, borderColor: "#1D242A" },
  ctrlBtnNeon: { backgroundColor: COLORS.neonDark, borderColor: COLORS.neon },
  ctrlText: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  ctrlTextNeon: { color: "#061006" },
});
