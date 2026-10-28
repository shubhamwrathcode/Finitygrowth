import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

const LINK_DISTANCE = 120;
const MAX_PULSES = 6;
const NODE_COUNT = 20;

/**
 * HeroBackground – Animated constellation particle network & ambient aurora.
 * Supports rendering children directly on top of the background animation.
 */
export default React.memo(function HeroBackground({ children, style }) {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  const width = dimensions.width || 390;
  const height = dimensions.height || 844;

  // 1. Aurora slow drift animation using Native Driver for butter-smooth 60fps
  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim1, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(anim2, {
          toValue: 1,
          duration: 22000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim2, {
          toValue: 0,
          duration: 22000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [anim1, anim2]);

  // 2. Constellation Nodes & Pulses Network
  const nodesRef = useRef([]);
  const pulsesRef = useRef([]);

  useEffect(() => {
    nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      r: Math.random() * 1.4 + 1.2,
      phase: Math.random() * Math.PI * 2,
    }));
    pulsesRef.current = [];
  }, [width, height]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let frameId;
    let lastTime = 0;
    const interval = 1000 / 30; // 30 FPS target for JS particle updates

    function step(now) {
      frameId = requestAnimationFrame(step);
      if (now - lastTime < interval) return;
      lastTime = now;

      const nodes = nodesRef.current;
      if (!nodes || nodes.length === 0) return;

      // Move nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }

      // Move pulses
      const pulses = pulsesRef.current;
      for (let i = 0; i < pulses.length; i++) {
        pulses[i].t += 0.016;
      }
      pulsesRef.current = pulses.filter(p => p.t < 1);

      // Spawn pulses along connected links
      if (pulsesRef.current.length < MAX_PULSES && Math.random() < 0.07) {
        const from = nodes[Math.floor(Math.random() * nodes.length)];
        const neighbours = nodes.filter(
          other => other !== from && Math.hypot(other.x - from.x, other.y - from.y) < LINK_DISTANCE
        );
        if (neighbours.length > 0) {
          const to = neighbours[Math.floor(Math.random() * neighbours.length)];
          pulsesRef.current.push({ from, to, t: 0 });
        }
      }

      setTick(t => (t + 1) % 100000);
    }

    frameId = requestAnimationFrame(step);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [width, height]);

  // Compute SVG line paths and pulse positions
  const { pathData, pulsesData, nodesData } = useMemo(() => {
    const nodes = nodesRef.current;
    if (!nodes || !nodes.length) return { pathData: '', pulsesData: [], nodesData: [] };

    let pData = '';
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < LINK_DISTANCE) {
          pData += `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)} `;
        }
      }
    }

    const pulses = pulsesRef.current.map(p => ({
      x: p.from.x + (p.to.x - p.from.x) * p.t,
      y: p.from.y + (p.to.y - p.from.y) * p.t,
    }));

    return { pathData: pData, pulsesData: pulses, nodesData: nodes };
  }, [tick]);

  const onLayout = event => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w && h && (w !== dimensions.width || h !== dimensions.height)) {
      setDimensions({ width: w, height: h });
    }
  };

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {/* Background visual layer - strictly behind all children */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Gold Aurora Orb (top right) */}
        <Animated.View
          style={[
            styles.orb,
            {
              width: 560,
              height: 560,
              top: -140,
              right: -120,
              transform: [
                {
                  translateX: anim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -50],
                  }),
                },
                {
                  translateY: anim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 40],
                  }),
                },
                {
                  scale: anim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.12],
                  }),
                },
              ],
            },
          ]}>
          <Svg width={560} height={560}>
            <Defs>
              <RadialGradient id="auroraGold" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor="#E3BF7A" stopOpacity={0.35} />
                <Stop offset="50%" stopColor="#E3B96E" stopOpacity={0.12} />
                <Stop offset="100%" stopColor="#07080C" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={280} cy={280} r={280} fill="url(#auroraGold)" />
          </Svg>
        </Animated.View>

        {/* Purple Aurora Orb (center / left) */}
        <Animated.View
          style={[
            styles.orb,
            {
              width: 620,
              height: 620,
              top: 120,
              left: -220,
              transform: [
                {
                  translateX: anim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 50],
                  }),
                },
                {
                  translateY: anim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -40],
                  }),
                },
                {
                  scale: anim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.14],
                  }),
                },
              ],
            },
          ]}>
          <Svg width={620} height={620}>
            <Defs>
              <RadialGradient id="auroraPurple" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor="#7A6CFF" stopOpacity="0.28" />
                <Stop offset="50%" stopColor="#5B4BD8" stopOpacity="0.09" />
                <Stop offset="100%" stopColor="#07080C" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={310} cy={310} r={310} fill="url(#auroraPurple)" />
          </Svg>
        </Animated.View>

        {/* Constellation Network & Pulses */}
        <Svg width={width} height={height} style={styles.canvasSvg}>
          {pathData ? (
            <Path
              d={pathData}
              stroke="rgba(227, 191, 122, 0.16)"
              strokeWidth={1}
              strokeLinecap="round"
            />
          ) : null}

          {nodesData.map((node, i) => (
            <Circle
              key={i}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill="rgba(246, 226, 179, 0.78)"
            />
          ))}

          {pulsesData.map((pulse, i) => (
            <React.Fragment key={i}>
              <Circle cx={pulse.x} cy={pulse.y} r={7} fill="rgba(227, 191, 122, 0.3)" />
              <Circle cx={pulse.x} cy={pulse.y} r={2.5} fill="#FFF6DC" />
            </React.Fragment>
          ))}
        </Svg>
      </View>

      {/* Foreground Content: rendered directly on top of background */}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  canvasSvg: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
});
