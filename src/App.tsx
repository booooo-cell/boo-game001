import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Star, Trophy, Heart, RefreshCw, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

// --- Constants ---
const TILE_SIZE = 32;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MOVE_SPEED = 4;

// --- Level Definition ---
const LEVEL = {
  width: 800,
  height: 600,
  tiles: [
    // Ground
    ...Array(25).fill(0).map((_, i) => ({ x: i * TILE_SIZE, y: 18 * TILE_SIZE, type: 1 })),
    // Platforms
    { x: 5 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },
    { x: 6 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },
    { x: 7 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },
    
    { x: 11 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },
    { x: 12 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },
    { x: 13 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },

    { x: 17 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },
    { x: 18 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },
    { x: 19 * TILE_SIZE, y: 14 * TILE_SIZE, type: 1 },

    { x: 14 * TILE_SIZE, y: 11 * TILE_SIZE, type: 1 },
    { x: 15 * TILE_SIZE, y: 11 * TILE_SIZE, type: 1 },
    { x: 16 * TILE_SIZE, y: 11 * TILE_SIZE, type: 1 },
    { x: 17 * TILE_SIZE, y: 11 * TILE_SIZE, type: 1 },
    { x: 18 * TILE_SIZE, y: 11 * TILE_SIZE, type: 1 },

    { x: 6 * TILE_SIZE, y: 8 * TILE_SIZE, type: 1 },
    { x: 7 * TILE_SIZE, y: 8 * TILE_SIZE, type: 1 },
    { x: 8 * TILE_SIZE, y: 8 * TILE_SIZE, type: 1 },
    { x: 9 * TILE_SIZE, y: 8 * TILE_SIZE, type: 1 },
    { x: 10 * TILE_SIZE, y: 8 * TILE_SIZE, type: 1 },

    // Spikes
    { x: 8 * TILE_SIZE, y: 17.5 * TILE_SIZE, type: 2 },
    { x: 9 * TILE_SIZE, y: 17.5 * TILE_SIZE, type: 2 },
    { x: 10 * TILE_SIZE, y: 17.5 * TILE_SIZE, type: 2 },

    // Gifts
    { x: 8 * TILE_SIZE, y: 7 * TILE_SIZE, type: 3 },
    { x: 16 * TILE_SIZE, y: 10 * TILE_SIZE, type: 3 },
    { x: 12 * TILE_SIZE, y: 13 * TILE_SIZE, type: 3 },
    { x: 22 * TILE_SIZE, y: 17 * TILE_SIZE, type: 3 },

    // Door (Finish)
    { x: 2 * TILE_SIZE, y: 16 * TILE_SIZE, type: 4 },
  ]
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'lost'>('start');
  const [collectedGifts, setCollectedGifts] = useState(0);
  const totalGifts = LEVEL.tiles.filter(t => t.type === 3).length;

  const playerRef = useRef({
    x: 50,
    y: 500,
    vx: 0,
    vy: 0,
    width: 24,
    height: 32,
    onGround: false,
    facing: 1,
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Mobile control state
  const [touchControls, setTouchControls] = useState({ left: false, right: false, up: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (gameState === 'start' && e.code === 'Space') startGame();
      if ((gameState === 'won' || gameState === 'lost') && e.code === 'KeyR') resetGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const startGame = () => {
    setGameState('playing');
    setCollectedGifts(0);
    playerRef.current = {
      x: 50,
      y: 500,
      vx: 0,
      vy: 0,
      width: 24,
      height: 32,
      onGround: false,
      facing: 1,
    };
    LEVEL.tiles.forEach(t => { if (t.type === 3) (t as any).collected = false; });
  };

  const resetGame = () => startGame();

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      const p = playerRef.current;

      // Movement logic (Keyboard + Touch)
      const left = keysRef.current['ArrowLeft'] || keysRef.current['KeyA'] || touchControls.left;
      const right = keysRef.current['ArrowRight'] || keysRef.current['KeyD'] || touchControls.right;
      const up = keysRef.current['ArrowUp'] || keysRef.current['KeyW'] || keysRef.current['Space'] || touchControls.up;

      if (left) {
        p.vx = -MOVE_SPEED;
        p.facing = -1;
      } else if (right) {
        p.vx = MOVE_SPEED;
        p.facing = 1;
      } else {
        p.vx *= 0.8;
      }

      if (up && p.onGround) {
        p.vy = JUMP_FORCE;
        p.onGround = false;
      }

      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;

      // Collision Detection
      p.onGround = false;
      LEVEL.tiles.forEach(tile => {
        if (tile.type === 1) { // Ground/Platform
          if (
            p.x < tile.x + TILE_SIZE &&
            p.x + p.width > tile.x &&
            p.y < tile.y + TILE_SIZE &&
            p.y + p.height > tile.y
          ) {
            const overlapX = Math.min(p.x + p.width - tile.x, tile.x + TILE_SIZE - p.x);
            const overlapY = Math.min(p.y + p.height - tile.y, tile.y + TILE_SIZE - p.y);

            if (overlapX > overlapY) {
              if (p.vy > 0) {
                p.y = tile.y - p.height;
                p.vy = 0;
                p.onGround = true;
              } else {
                p.y = tile.y + TILE_SIZE;
                p.vy = 0;
              }
            } else {
              if (p.vx > 0) p.x = tile.x - p.width;
              else p.x = tile.x + TILE_SIZE;
            }
          }
        } else if (tile.type === 2) { // Spike
          if (
            p.x < tile.x + TILE_SIZE &&
            p.x + p.width > tile.x &&
            p.y < tile.y + TILE_SIZE &&
            p.y + p.height > tile.y
          ) {
            setGameState('lost');
          }
        } else if (tile.type === 3 && !(tile as any).collected) { // Gift
          if (
            p.x < tile.x + TILE_SIZE &&
            p.x + p.width > tile.x &&
            p.y < tile.y + TILE_SIZE &&
            p.y + p.height > tile.y
          ) {
            (tile as any).collected = true;
            setCollectedGifts(prev => prev + 1);
          }
        } else if (tile.type === 4) { // Door
          if (
            p.x < tile.x + TILE_SIZE &&
            p.x + p.width > tile.x &&
            p.y < tile.y + TILE_SIZE &&
            p.y + p.height > tile.y
          ) {
             setCollectedGifts(current => {
                if (current === totalGifts) setGameState('won');
                return current;
             });
          }
        }
      });

      if (p.x < 0) p.x = 0;
      if (p.x + p.width > LEVEL.width) p.x = LEVEL.width - p.width;
      if (p.y > LEVEL.height) setGameState('lost');
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = '#0a0a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for(let i=0; i<50; i++) {
        const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(i * 678.90) * 0.5 + 0.5) * canvas.height;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
        ctx.fillRect(x, y, 2, 2);
      }

      // Draw Level
      LEVEL.tiles.forEach(tile => {
        if (tile.type === 1) {
          ctx.fillStyle = '#4a3a2a';
          ctx.fillRect(tile.x, tile.y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#2a8a2a';
          ctx.fillRect(tile.x, tile.y, TILE_SIZE, 4);
        } else if (tile.type === 2) {
          ctx.fillStyle = '#8a8a8a';
          ctx.beginPath();
          ctx.moveTo(tile.x, tile.y + TILE_SIZE);
          ctx.lineTo(tile.x + TILE_SIZE / 2, tile.y);
          ctx.lineTo(tile.x + TILE_SIZE, tile.y + TILE_SIZE);
          ctx.fill();
        } else if (tile.type === 3 && !(tile as any).collected) {
          ctx.fillStyle = '#ff4e00';
          ctx.fillRect(tile.x + 4, tile.y + 8, 24, 24);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(tile.x + 14, tile.y + 8, 4, 24);
          ctx.fillRect(tile.x + 4, tile.y + 18, 24, 4);
        } else if (tile.type === 4) {
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(tile.x, tile.y, TILE_SIZE, TILE_SIZE * 2);
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(tile.x + 2, tile.y + 2, TILE_SIZE - 4, TILE_SIZE * 2 - 4);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(tile.x + TILE_SIZE - 8, tile.y + TILE_SIZE, 4, 4);
        }
      });

      // Draw Player
      const p = playerRef.current;
      ctx.fillStyle = '#ffccaa';
      ctx.fillRect(p.x + 4, p.y, 16, 16);
      ctx.fillStyle = '#3366ff';
      ctx.fillRect(p.x, p.y + 16, 24, 16);
      ctx.fillStyle = '#000';
      if (p.facing === 1) {
        ctx.fillRect(p.x + 14, p.y + 4, 2, 2);
        ctx.fillRect(p.x + 18, p.y + 4, 2, 2);
      } else {
        ctx.fillRect(p.x + 4, p.y + 4, 2, 2);
        ctx.fillRect(p.x + 8, p.y + 4, 2, 2);
      }

      // HUD
      ctx.font = '12px "Press Start 2P"';
      ctx.fillStyle = '#fff';
      ctx.fillText(`GIFTS: ${collectedGifts}/${totalGifts}`, 20, 40);
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, collectedGifts, totalGifts, touchControls]);

  const handleTouchStart = (dir: 'left' | 'right' | 'up') => setTouchControls(prev => ({ ...prev, [dir]: true }));
  const handleTouchEnd = (dir: 'left' | 'right' | 'up') => setTouchControls(prev => ({ ...prev, [dir]: false }));

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-2 font-pixel select-none">
      <div className="relative pixel-border bg-black overflow-hidden max-w-full" style={{ width: LEVEL.width, height: LEVEL.height, aspectRatio: '4/3' }}>
        <canvas
          ref={canvasRef}
          width={LEVEL.width}
          height={LEVEL.height}
          className="w-full h-full object-contain"
        />

        <AnimatePresence>
          {gameState === 'start' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white text-center p-4 z-40"
            >
              <h1 className="text-xl md:text-3xl mb-6 leading-relaxed">像素生日大冒险</h1>
              <div className="flex gap-4 md:gap-8 mb-8">
                <div className="flex flex-col items-center">
                  <Gift className="w-8 h-8 md:w-12 md:h-12 text-orange-500 mb-2" />
                  <span className="text-[8px] md:text-[10px]">收集礼物</span>
                </div>
                <div className="flex flex-col items-center">
                  <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-500 mb-2" />
                  <span className="text-[8px] md:text-[10px]">到达终点</span>
                </div>
              </div>
              <button onClick={startGame} className="pixel-button mb-6">开始游戏</button>
              <p className="text-[8px] md:text-[10px] opacity-60">
                电脑: 方向键移动 | 手机: 屏幕按键
              </p>
            </motion.div>
          )}

          {gameState === 'won' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-[#0a0a2a] flex flex-col items-center justify-center text-white text-center p-4 z-50"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -20, x: Math.random() * LEVEL.width }}
                    animate={{ y: LEVEL.height + 20, rotate: 360 }}
                    transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
                    className="absolute"
                  >
                    <Star className="text-yellow-400 w-4 h-4 fill-current" />
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="relative z-10 px-4">
                <Heart className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-6 fill-current animate-bounce" />
                <h2 className="text-lg md:text-2xl mb-6 text-yellow-400">恭喜通关！</h2>
                <p className="text-sm md:text-lg mb-8 leading-loose">
                  希望今天是你特别的一天 ❤️<br/>
                  <span className="text-xs md:text-sm mt-2 block">—Boo</span>
                </p>
                <button onClick={resetGame} className="pixel-button flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" /> 再玩一次
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'lost' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-red-900/40 flex flex-col items-center justify-center text-white text-center p-4 z-40"
            >
              <h2 className="text-xl mb-6">哎呀！失败了</h2>
              <button onClick={resetGame} className="pixel-button flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> 重新开始
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Controls */}
      {gameState === 'playing' && (
        <div className="mt-4 flex justify-between w-full max-w-[400px] px-4">
          <div className="flex gap-4">
            <button 
              className={`w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center active:bg-white/30 transition-colors ${touchControls.left ? 'bg-white/30' : ''}`}
              onTouchStart={() => handleTouchStart('left')}
              onTouchEnd={() => handleTouchEnd('left')}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={() => handleTouchEnd('left')}
              onMouseLeave={() => handleTouchEnd('left')}
            >
              <ArrowLeft className="text-white w-8 h-8" />
            </button>
            <button 
              className={`w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center active:bg-white/30 transition-colors ${touchControls.right ? 'bg-white/30' : ''}`}
              onTouchStart={() => handleTouchStart('right')}
              onTouchEnd={() => handleTouchEnd('right')}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={() => handleTouchEnd('right')}
              onMouseLeave={() => handleTouchEnd('right')}
            >
              <ArrowRight className="text-white w-8 h-8" />
            </button>
          </div>
          <button 
            className={`w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center active:bg-white/30 transition-colors ${touchControls.up ? 'bg-white/30' : ''}`}
            onTouchStart={() => handleTouchStart('up')}
            onTouchEnd={() => handleTouchEnd('up')}
            onMouseDown={() => handleTouchStart('up')}
            onMouseUp={() => handleTouchEnd('up')}
            onMouseLeave={() => handleTouchEnd('up')}
          >
            <ArrowUp className="text-white w-8 h-8" />
          </button>
        </div>
      )}

      <div className="mt-4 text-white/20 text-[8px] md:text-[10px] hidden md:block">
        [↑/W/空格] 跳跃 | [←/A][→/D] 移动 | [R] 重置
      </div>
    </div>
  );
}
