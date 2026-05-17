import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Shield, Zap, Magnet, Award, Lock, LogOut, CheckCircle, AlertCircle, Loader, ShoppingBag, Trophy, User } from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://eagle-dash-production.up.railway.app/api';

const getRank = (score: number) => {
    if (score < 500) return { title: 'Fledgling', color: '#94a3b8' };
    if (score < 1500) return { title: 'Scout', color: '#22c55e' };
    if (score < 3000) return { title: 'Hunter', color: '#3b82f6' };
    if (score < 5000) return { title: 'Ace', color: '#a855f7' };
    if (score < 10000) return { title: 'Predator', color: '#f43f5e' };
    return { title: 'Sky Legend', color: '#fbbf24' };
};

interface ShopItem {
    id: string;
    name: string;
    category: 'skin' | 'wings' | 'beak' | 'eyes' | 'powerup';
    color: string;
    price: number;
}

const SHOP_ITEMS: ShopItem[] = [
    { id: 'original', name: 'Standard Eagle', category: 'skin', color: '#f97316', price: 0 },
    { id: 'blue', name: 'Blue Jay', category: 'skin', color: '#3b82f6', price: 0.99 },
    { id: 'gold_skin', name: 'Golden Phoenix', category: 'skin', color: '#fbbf24', price: 4.99 },
    { id: 'steel_wings', name: 'Steel Wings', category: 'wings', color: '#94a3b8', price: 1.50 },
    { id: 'super_wings', name: 'Super Nova Wings', category: 'wings', color: '#6366f1', price: 3.99 },
    { id: 'golden_wings', name: 'Royal Gold Wings', category: 'wings', color: '#fbbf24', price: 7.50 },
    { id: 'sharp_beak', name: 'Sharp Beak', category: 'beak', color: '#000', price: 0.75 },
    { id: 'speed_beak', name: 'Hyper Speed Beak', category: 'beak', color: '#f43f5e', price: 2.25 },
    { id: 'diamond_beak', name: 'Diamond Edge Beak', category: 'beak', color: '#22d3ee', price: 5.99 },
    { id: 'red_eyes', name: 'Red Glow Eyes', category: 'eyes', color: '#ef4444', price: 0.50 },
    { id: 'blue_eyes', name: 'Electric Blue Eyes', category: 'eyes', color: '#06b6d4', price: 0.50 },
    { id: 'void_eyes', name: 'Void Stare Eyes', category: 'eyes', color: '#a855f7', price: 2.99 },
    { id: 'extra_shield', name: 'Iron Shield', category: 'powerup', color: '#3b82f6', price: 1.25 },
    { id: 'extra_magnet', name: 'Gold Magnet', category: 'powerup', color: '#a855f7', price: 1.25 },
    { id: 'extra_boost', name: 'Rocket Boost', category: 'powerup', color: '#22c55e', price: 1.25 },
];

interface Entity { 
  x: number; 
  y: number; 
  width: number; 
  height: number; 
  type: 'obstacle' | 'credit' | 'shield' | 'magnet' | 'boost' | 'moving_obstacle' | 'owl' | 'crow' | 'ring';
  dy?: number;
}

class Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string; size: number;
  constructor(x: number, y: number, color: string) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 4 + 2;
  }
  update() { this.x += this.vx; this.y += this.vy; this.life -= 0.02; }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

const App: React.FC = () => {
  const [token, setToken] = useState(localStorage.getItem('eagleToken') || '');
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<'AUTH' | 'SUBSCRIBE' | 'START' | 'PLAYING' | 'GAMEOVER'>('AUTH');
  const [overlayTab, setOverlayTab] = useState<'MAIN' | 'LEADERBOARD' | 'SHOP'>('MAIN');
  const [isGuest, setIsGuest] = useState(false);
  const [guestPlays, setGuestPlays] = useState(() => parseInt(localStorage.getItem('guestPlays') || '3'));
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialPulse, setTutorialPulse] = useState(true);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'stats' | 'users'>('stats');
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const ADMIN_EMAIL = 'saqlain.senior21@gmail.com';

  // Game Logic State
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState({ shield: false, magnet: 0, boost: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  
  // Customization State
  const [activeSkin, setActiveSkin] = useState(localStorage.getItem('activeSkin') || 'original');
  const [activeWings, setActiveWings] = useState(localStorage.getItem('activeWings') || 'original');
  const [activeBeak, setActiveBeak] = useState(localStorage.getItem('activeBeak') || 'original');
  const [activeEyes, setActiveEyes] = useState(localStorage.getItem('activeEyes') || 'original');
  const [activePowerUp, setActivePowerUp] = useState(localStorage.getItem('activePowerUp') || 'none');
  const [shopCategory, setShopCategory] = useState<'skin' | 'wings' | 'beak' | 'eyes' | 'powerup'>('skin');
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / 400;
      const scaleY = window.innerHeight / 600;
      setCanvasScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eaglePos = useRef({ y: 300, velocity: 0 });
  const isFlying = useRef(false);
  const entities = useRef<Entity[]>([]);
  const particles = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const powerUpTimers = useRef({ shield: false, magnet: 0, boost: 0 });
  const bgOffset = useRef({ far: 0, mid: 0 });
  const stars = useRef<{x: number, y: number, size: number}[]>([]);
  const crowOnBack = useRef(false);
  const eagleRotation = useRef(0);
  const isSpinning = useRef(false);
  const isFlipping = useRef(false);
  const stuntTimer = useRef(0);

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const GRAVITY = 0.4;
  const LIFT = -8;
  const BASE_SPEED = 3.5;

  // Initialize stars once
  useEffect(() => {
    const s = [];
    for(let i=0; i<50; i++) s.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT/2), size: Math.random() * 2 });
    stars.current = s;
  }, []);

  const api = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    localStorage.setItem('activeSkin', activeSkin);
    localStorage.setItem('activeWings', activeWings);
    localStorage.setItem('activeBeak', activeBeak);
    localStorage.setItem('activeEyes', activeEyes);
    localStorage.setItem('activePowerUp', activePowerUp);
  }, [activeSkin, activeWings, activeBeak, activeEyes, activePowerUp]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // Handle PayPal return after payment approval
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get('paypal');
    const orderId = params.get('token');
    if (paypalStatus === 'success' && orderId && token) {
      window.history.replaceState({}, '', window.location.pathname);
      (async () => {
        try {
          const res = await api.post('/payment/paypal/capture-order', { orderId });
          if (res.data.success) {
            showToast('Payment confirmed! Welcome to Eagle Dash!', 'success');
            setGameState('START');
            verifyStatus();
          }
        } catch { showToast('Payment capture failed. Contact support.', 'error'); }
      })();
    } else if (paypalStatus === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
      showToast('Payment cancelled.', 'error');
    }
  }, [token]);

  useEffect(() => {
    if (token) { verifyStatus(); fetchInventory(); }
    else { setGameState('AUTH'); }
  }, [token]);

  const startGuestMode = () => {
    setIsGuest(true);
    const tutorialSeen = localStorage.getItem('tutorialSeen');
    if (!tutorialSeen) setShowTutorial(true);
    setGameState('START');
  };

  const verifyStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/status');
      setUser(res.data);
      setHighScore(res.data.high_score);
      setCoins(res.data.coins);
      if (res.data.is_subscribed) setGameState('START');
      else setGameState('SUBSCRIBE');
    } catch (err) {
      setToken('');
      localStorage.removeItem('eagleToken');
    } finally { setLoading(false); }
  };

  const fetchInventory = async () => {
    try {
      const res = await api.get('/user/inventory');
      // Ensure all base items are available
      setInventory(['original', 'steel_wings', 'sharp_beak', 'red_eyes', 'extra_shield', 'extra_magnet', 'extra_boost', ...res.data]);
    } catch (err) { 
      console.error(err); 
      setInventory(['original', 'steel_wings', 'sharp_beak', 'red_eyes', 'extra_shield', 'extra_magnet', 'extra_boost']); 
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/leaderboard');
      setLeaderboard(res.data);
    } catch (err) { console.error(err); }
  };

    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      try {
        const res = await axios.post(`${API_BASE}${endpoint}`, authForm);
        setToken(res.data.token);
        localStorage.setItem('eagleToken', res.data.token);
        showToast('Welcome!', 'success');
      } catch (err: any) {
        console.error('Auth Error:', err);
        const msg = err.response?.data?.error || 'Server unreachable or auth failed';
        showToast(msg, 'error');
      } finally { setLoading(false); }
    };


  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payment/paypal/create-order');
      if (res.data.approvalUrl) {
        window.location.href = res.data.approvalUrl;
      } else {
        showToast('Payment system not ready', 'error');
      }
    } catch (err) { showToast('Payment failed', 'error'); }
    finally { setLoading(false); }
  };

  const fetchAdminStats = async () => {
    try {
      const [stats, users] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);
      setAdminStats(stats.data);
      setAdminUsers(users.data);
    } catch { showToast('Failed to load admin data', 'error'); }
  };

  const adminGrantSub = async (id: number) => {
    await api.post(`/admin/users/${id}/subscribe`);
    setAdminUsers(u => u.map(x => x.id === id ? { ...x, is_subscribed: 1 } : x));
    showToast('Subscription granted', 'success');
  };

  const adminRevokeSub = async (id: number) => {
    await api.post(`/admin/users/${id}/unsubscribe`);
    setAdminUsers(u => u.map(x => x.id === id ? { ...x, is_subscribed: 0 } : x));
    showToast('Subscription revoked', 'info');
  };

  const adminDeleteUser = async (id: number) => {
    await api.delete(`/admin/users/${id}`);
    setAdminUsers(u => u.filter(x => x.id !== id));
    showToast('User deleted', 'info');
  };

  const handlePurchase = async (item: ShopItem) => {
    if (coins < item.price) return showToast('Not enough coins!', 'error');
    setLoading(true);
    try {
      await api.post('/shop/purchase', { item_id: item.id, price: item.price });
      setCoins(c => c - item.price);
      setInventory(prev => [...prev, item.id]);
      showToast(`${item.name} purchased!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Purchase failed', 'error');
    } finally { setLoading(false); }
  };

  const handleEquip = (item: ShopItem) => {
      if (item.category === 'skin') setActiveSkin(item.id);
      if (item.category === 'wings') setActiveWings(item.id);
      if (item.category === 'beak') setActiveBeak(item.id);
      if (item.category === 'eyes') setActiveEyes(item.id);
      if (item.category === 'powerup') setActivePowerUp(item.id);
  };

  const resetGame = () => {
    eaglePos.current = { y: 300, velocity: 0 };
    entities.current = [];
    particles.current = [];
    
    // Default timers
    const initialPowerUps = { shield: false, magnet: 0, boost: 0 };
    
    // Apply equipped powerup
    if (activePowerUp === 'extra_shield') initialPowerUps.shield = true;
    if (activePowerUp === 'extra_magnet') initialPowerUps.magnet = 600;
    if (activePowerUp === 'extra_boost') initialPowerUps.boost = 300;

    powerUpTimers.current = initialPowerUps;
    crowOnBack.current = false;
    setScore(0);
    setDistance(0);
    setActivePowerUps(initialPowerUps);
    setGameState('PLAYING');
  };

  const handleInput = (start: boolean) => {
    if (gameState !== 'PLAYING') {
      if (overlayTab === 'MAIN' && (gameState === 'START' || gameState === 'GAMEOVER')) resetGame();
      return;
    }
    isFlying.current = start;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'PLAYING') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      update();
      draw(ctx);
      frameRef.current = requestAnimationFrame(loop);
    };

    const update = () => {
      const difficultyFactor = 1 + (distance / 500);
      let currentSpeed = (powerUpTimers.current.boost > 0 ? BASE_SPEED * 2 : BASE_SPEED) * difficultyFactor;
      
      // Crow penalty: slow down and increase gravity
      const effectiveGravity = crowOnBack.current ? GRAVITY * 1.5 : GRAVITY;
      const effectiveLift = crowOnBack.current ? LIFT * 0.7 : LIFT;
      if (crowOnBack.current) currentSpeed *= 0.8;

      // Day/Night Cycle
      const cyclePos = (distance % 1500) / 1500;
      const isNight = cyclePos > 0.4 && cyclePos < 0.9;

      bgOffset.current.far -= currentSpeed * 0.1;
      bgOffset.current.mid -= currentSpeed * 0.3;

      if (isFlying.current) eaglePos.current.velocity = effectiveLift;
      eaglePos.current.velocity += effectiveGravity;
      eaglePos.current.y += eaglePos.current.velocity;

      // Kill crow at high altitude (y < 80)
      if (crowOnBack.current && eaglePos.current.y < 80) {
          crowOnBack.current = false;
          createExplosion(70, eaglePos.current.y, '#000');
          showToast('Crow defeated at high altitude!', 'success');
      }

      // Handle Stunt Animations
      if (isSpinning.current || isFlipping.current) {
          eagleRotation.current += 15;
          if (eagleRotation.current >= 360) {
              eagleRotation.current = 0;
              isSpinning.current = false;
              isFlipping.current = false;
          }
      }

      if (eaglePos.current.y > CANVAS_HEIGHT - 30 || eaglePos.current.y < 0) {
        if (!powerUpTimers.current.boost) { createExplosion(70, eaglePos.current.y + 15, '#ef4444'); setGameState('GAMEOVER'); return; }
        else eaglePos.current.y = Math.max(0, Math.min(CANVAS_HEIGHT - 30, eaglePos.current.y));
      }

      entities.current.forEach(e => {
        e.x -= currentSpeed;
        if (e.type === 'moving_obstacle' && e.dy) {
          e.y += e.dy;
          if (e.y < 50 || e.y > CANVAS_HEIGHT - 150) e.dy *= -1;
        }
        if (e.type === 'owl') {
            const targetY = eaglePos.current.y;
            const dy = (targetY - e.y) * 0.02;
            e.y += dy;
            e.x -= currentSpeed * 0.5;
        }
        if (e.type === 'crow') {
            // Aggressive Crow: Target the eagle's Y
            const targetY = eaglePos.current.y;
            const dy = (targetY - e.y) * 0.04; // Fast tracking
            e.y += dy;
            e.x -= currentSpeed * 0.2; // Move toward player slightly
        }
        if (powerUpTimers.current.magnet > 0 && e.type === 'credit') {
          const dx = 50 - e.x; const dy = eaglePos.current.y - e.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 200) { e.x += dx * 0.1; e.y += dy * 0.1; }
        }
      });
      entities.current = entities.current.filter(e => e.x > -100);

      particles.current.forEach(p => p.update());
      particles.current = particles.current.filter(p => p.life > 0);

      if (frameRef.current % Math.max(40, Math.floor(80 / difficultyFactor)) === 0) {
        const rand = Math.random();
        let newEntity: Entity;
        
        if (isNight && rand < 0.2) {
            newEntity = { x: CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT - 50) + 25, width: 50, height: 40, type: 'owl' };
        } else if (!isNight && rand < 0.15 && !crowOnBack.current) {
            newEntity = { x: CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT - 50) + 25, width: 30, height: 20, type: 'crow' };
        } else if (rand < 0.1) {
            // Spawn Ring
            newEntity = { x: CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT - 100) + 50, width: 60, height: 60, type: 'ring' };
        } else if (rand < 0.6) {
          const isMoving = Math.random() > 0.7;
          newEntity = { x: CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT - 200) + 50, width: 40, height: 100, type: isMoving ? 'moving_obstacle' : 'obstacle', dy: isMoving ? 2 : 0 };
        } else if (rand < 0.9) {
          newEntity = { x: CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT - 50) + 25, width: 30, height: 30, type: 'credit' };
        } else {
          const pTypes: any[] = ['shield', 'magnet', 'boost'];
          newEntity = { x: CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT - 50) + 25, width: 35, height: 35, type: pTypes[Math.floor(Math.random() * 3)] };
        }
        entities.current.push(newEntity);
      }

      entities.current.forEach((e, i) => {
        const eagleRect = { x: 50, y: eaglePos.current.y, w: 40, h: 30 };
        if (eagleRect.x < e.x + e.width && eagleRect.x + eagleRect.w > e.x && eagleRect.y < e.y + e.height && eagleRect.y + eagleRect.h > e.y) {
          if (e.type === 'ring') {
              if (!isSpinning.current) {
                  isSpinning.current = true;
                  setScore(s => s + 50);
                  showToast('STUNT! +50', 'success');
                  entities.current.splice(i, 1);
              }
          } else if (e.type === 'crow') {
              if (powerUpTimers.current.boost) { createExplosion(e.x + 15, e.y + 10, '#000'); entities.current.splice(i, 1); return; }
              crowOnBack.current = true;
              entities.current.splice(i, 1);
              showToast('Crow attached! Fly HIGH to kill it!', 'info');
          } else if (e.type === 'obstacle' || e.type === 'moving_obstacle' || e.type === 'owl') {
            if (powerUpTimers.current.boost) { createExplosion(e.x + e.width/2, e.y + e.height/2, e.type === 'owl' ? '#78350f' : '#ef4444'); entities.current.splice(i, 1); return; }
            if (powerUpTimers.current.shield) { createExplosion(e.x + e.width/2, e.y + e.height/2, '#3b82f6'); powerUpTimers.current.shield = false; entities.current.splice(i, 1); }
            else { createExplosion(70, eaglePos.current.y + 15, '#ef4444'); setGameState('GAMEOVER'); }
          } else if (e.type === 'credit') { createExplosion(e.x + 15, e.y + 15, '#fbbf24'); setScore(s => s + 10); entities.current.splice(i, 1); }
          else {
            const pColor = e.type === 'shield' ? '#3b82f6' : e.type === 'magnet' ? '#a855f7' : '#22c55e';
            createExplosion(e.x + 15, e.y + 15, pColor);
            if (e.type === 'shield') powerUpTimers.current.shield = true;
            else if (e.type === 'magnet') powerUpTimers.current.magnet = 300;
            else if (e.type === 'boost') powerUpTimers.current.boost = 200;
            entities.current.splice(i, 1);
          }
        }
      });

      if (powerUpTimers.current.magnet > 0) powerUpTimers.current.magnet--;
      if (powerUpTimers.current.boost > 0) powerUpTimers.current.boost--;
      if (frameRef.current % 10 === 0) setActivePowerUps({ shield: powerUpTimers.current.shield, magnet: powerUpTimers.current.magnet, boost: powerUpTimers.current.boost });

      setDistance(d => d + (currentSpeed / 35));
    };

    const createExplosion = (x: number, y: number, color: string) => {
      for (let i = 0; i < 15; i++) particles.current.push(new Particle(x, y, color));
    };

    const drawEagle = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
        const wingPos = Math.sin(frameRef.current * 0.2) * 12;
        const wingsColor = SHOP_ITEMS.find(i => i.id === activeWings)?.color || color;
        const beakColor = SHOP_ITEMS.find(i => i.id === activeBeak)?.color || '#fbbf24';
        const eyesColor = SHOP_ITEMS.find(i => i.id === activeEyes)?.color || '#000';

        ctx.save();
        ctx.translate(x + 20, y + 15);
        ctx.rotate((eagleRotation.current * Math.PI) / 180);

        // Detailed Wings
        ctx.fillStyle = wingsColor;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(-25, -20 - wingPos, -50, -10 + wingPos);
        ctx.quadraticCurveTo(-20, -5, -15, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(-25, 20 + wingPos, -50, 10 - wingPos);
        ctx.quadraticCurveTo(-20, 5, -15, 0);
        ctx.fill();

        // Main Body
        const grad = ctx.createLinearGradient(-20, 0, 20, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, '#78350f');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.bezierCurveTo(-10, -15, 10, -15, 25, 0);
        ctx.bezierCurveTo(10, 15, -10, 15, -20, 0);
        ctx.fill();

        // Tail feathers
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-35, -10);
        ctx.lineTo(-30, 0);
        ctx.lineTo(-35, 10);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(22, -2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = beakColor;
        ctx.beginPath();
        ctx.moveTo(28, -2);
        ctx.lineTo(38, 3);
        ctx.lineTo(28, 5);
        ctx.fill();

        // Eye
        ctx.fillStyle = eyesColor;
        if (activeEyes !== 'original') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = eyesColor;
        }
        ctx.beginPath();
        ctx.arc(24, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    };

    const drawOwl = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
        ctx.save();
        ctx.translate(x, y);

        // Body
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.ellipse(25, 20, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings (tucked)
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 30, 20);

        // Ear Tufts
        ctx.beginPath();
        ctx.moveTo(15, 10); ctx.lineTo(10, 0); ctx.lineTo(20, 5); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(35, 10); ctx.lineTo(40, 0); ctx.lineTo(30, 5); ctx.fill();

        // Eyes (Glow)
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(18, 15, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(32, 15, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(18, 15, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(32, 15, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    };

    const drawCrow = (ctx: CanvasRenderingContext2D, x: number, y: number, isAttached: boolean) => {
        ctx.save();
        ctx.translate(x, y);
        if (isAttached) ctx.scale(0.8, 0.8);
        
        ctx.fillStyle = '#0f172a'; // Near black
        // Body
        ctx.beginPath(); ctx.ellipse(15, 10, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Head
        ctx.beginPath(); ctx.arc(25, 7, 5, 0, Math.PI * 2); ctx.fill();
        // Beak
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.moveTo(30, 7); ctx.lineTo(38, 9); ctx.lineTo(30, 11); ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(27, 6, 1, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    };

    const drawRing = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
        ctx.save();
        ctx.translate(x + 30, y + 30);
        
        // Neon Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 5;
        
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner circle
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const cyclePos = (distance % 1500) / 1500;
      let skyColor;
      if (cyclePos < 0.3) skyColor = '#38bdf8'; // Day
      else if (cyclePos < 0.45) skyColor = '#f97316'; // Sunset
      else if (cyclePos < 0.85) skyColor = '#020617'; // Night
      else skyColor = '#6366f1'; // Sunrise

      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stars at night
      if (cyclePos > 0.4 && cyclePos < 0.9) {
          ctx.fillStyle = '#fff';
          const alpha = cyclePos > 0.45 && cyclePos < 0.8 ? 1 : 0.5;
          ctx.globalAlpha = alpha;
          stars.current.forEach(s => {
              ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
          });
          ctx.globalAlpha = 1;
      }

      // Parallax Far
      ctx.fillStyle = (cyclePos > 0.4 && cyclePos < 0.9) ? '#0f172a' : '#1e293b';
      for (let i = 0; i < 3; i++) {
        const x = (bgOffset.current.far % CANVAS_WIDTH) + i * CANVAS_WIDTH;
        ctx.beginPath(); ctx.moveTo(x, 400); ctx.lineTo(x + 200, 200); ctx.lineTo(x + 400, 400); ctx.fill();
      }
      // Parallax Mid
      ctx.fillStyle = (cyclePos > 0.4 && cyclePos < 0.9) ? '#020617' : '#0f172a';
      for (let i = 0; i < 3; i++) {
        const x = (bgOffset.current.mid % CANVAS_WIDTH) + i * CANVAS_WIDTH;
        ctx.beginPath(); ctx.moveTo(x, 500); ctx.lineTo(x + 150, 350); ctx.lineTo(x + 300, 500); ctx.fill();
      }

      particles.current.forEach(p => p.draw(ctx));

      const skinColor = SHOP_ITEMS.find(s => s.id === activeSkin)?.color || '#f97316';
      if (powerUpTimers.current.boost > 0) { 
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4; ctx.strokeRect(45, eaglePos.current.y - 5, 50, 40); 
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'; ctx.fillRect(45 - (frameRef.current % 20), eaglePos.current.y - 5, 50, 40);
      }
      else if (powerUpTimers.current.shield) { ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(70, eaglePos.current.y + 15, 30, 0, Math.PI * 2); ctx.stroke(); }

      drawEagle(ctx, 50, eaglePos.current.y, powerUpTimers.current.boost > 0 ? '#fbbf24' : skinColor);
      if (crowOnBack.current) drawCrow(ctx, 45, eaglePos.current.y - 10, true);

      entities.current.forEach(e => {
        if (e.type === 'owl') {
            drawOwl(ctx, e.x, e.y);
        } else if (e.type === 'crow') {
            drawCrow(ctx, e.x, e.y, false);
        } else if (e.type === 'ring') {
            drawRing(ctx, e.x, e.y);
        } else if (e.type === 'obstacle' || e.type === 'moving_obstacle') { 
            const grad = ctx.createLinearGradient(e.x, e.y, e.x + e.width, e.y + e.height);
            grad.addColorStop(0, e.type === 'moving_obstacle' ? '#f43f5e' : '#ef4444');
            grad.addColorStop(1, '#7f1d1d');
            ctx.fillStyle = grad; ctx.fillRect(e.x, e.y, e.width, e.height); 
        }
        else if (e.type === 'credit') { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(e.x + 15, e.y + 15, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d97706'; ctx.fillText('$', e.x + 11, e.y + 20); }
        else {
            const pColor = e.type === 'shield' ? '#3b82f6' : e.type === 'magnet' ? '#a855f7' : '#22c55e';
            ctx.fillStyle = pColor; ctx.beginPath(); ctx.arc(e.x + 15, e.y + 15, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        }
      });
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, activeSkin, activeWings, activeBeak, activeEyes]);

  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      if (isGuest) {
        const remaining = guestPlays - 1;
        setGuestPlays(remaining);
        localStorage.setItem('guestPlays', String(remaining));
      } else {
        const runScore = Math.floor(distance + score);
        const earnedUSD = parseFloat(((score + distance) / 2000).toFixed(2));
        api.post('/user/score', { score: runScore, coins: earnedUSD }).then(res => {
            setHighScore(res.data.high_score);
            setCoins(res.data.coins);
        });
        fetchLeaderboard();
      }
    }
    if (gameState === 'PLAYING') {
      const tutorialSeen = localStorage.getItem('tutorialSeen');
      if (!tutorialSeen) {
        setShowTutorial(true);
        setTutorialPulse(true);
      }
    }
  }, [gameState]);

  return (
    <div className="game-wrapper">
      <div className="toast-container">{toasts.map(t => (<div key={t.id} className={`toast ${t.type}`}>{t.type === 'success' ? <CheckCircle size={18} /> : t.type === 'error' ? <AlertCircle size={18} /> : <Loader size={18} />}{t.message}</div>))}</div>

      <div className="game-container" style={{ transform: `scale(${canvasScale})`, transformOrigin: 'center center' }}>
        {gameState === 'AUTH' && (
          <div className="overlay" onMouseDown={e => e.stopPropagation()}>
            <h1 style={{ fontSize: '2.8rem', letterSpacing: 2 }}>🦅 EAGLE DASH</h1>
            <p style={{ color: '#fbbf24', fontWeight: 800, marginBottom: '0.25rem' }}>Dodge. Survive. Dominate.</p>

            {guestPlays > 0 && (
              <button className="start-btn" onClick={startGuestMode} style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                ▶ PLAY FREE ({guestPlays} free {guestPlays === 1 ? 'play' : 'plays'} left)
              </button>
            )}

            <div style={{ width: '100%', borderTop: '1px solid #1e293b', paddingTop: '0.75rem', marginTop: guestPlays > 0 ? '0' : '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.5rem' }}>{isRegistering ? 'Create account to save scores' : 'Login to your account'}</p>
              <form className="auth-form" onSubmit={handleAuth} style={{ gap: '0.6rem' }}>
                <input type="email" placeholder="Email" required onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                <input type="password" placeholder="Password" required onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                <button type="submit" className="start-btn" style={{ background: '#1e293b', border: '1px solid #3b82f6', fontSize: '0.9rem', padding: '0.9rem' }}>{loading ? <div className="spinner" /> : (isRegistering ? 'REGISTER' : 'LOGIN')}</button>
              </form>
              <p onClick={() => setIsRegistering(!isRegistering)} style={{ cursor: 'pointer', marginTop: '0.5rem', fontSize: '0.8rem' }}>{isRegistering ? 'Have account? Login' : 'New? Register'}</p>
            </div>
          </div>
        )}

        {gameState === 'SUBSCRIBE' && (
          <div className="overlay" onMouseDown={e => e.stopPropagation()}>
            <Lock size={48} color="#fbbf24" style={{ marginBottom: '1rem' }} />
            <h1 style={{ color: '#f97316' }}>EAGLE DASH</h1>
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Infinite Flight Pass</p>
            <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', padding: '1rem 2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fbbf24' }}>$0.05</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>One-time unlock · All features</div>
            </div>
            <button className="start-btn" onClick={handleSubscribe} style={{ background: '#0070ba', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {loading ? <div className="spinner" /> : <>
                <span style={{ fontStyle: 'italic', fontWeight: 900, fontSize: '1.1rem' }}>Pay<span style={{ color: '#ffd140' }}>Pal</span></span>
                <span>— Pay $0.05</span>
              </>}
            </button>
            <button className="start-btn" style={{ marginTop: '0.75rem', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '0.7rem' }} onClick={() => { setToken(''); localStorage.removeItem('eagleToken'); setGameState('AUTH'); }}>LOGOUT</button>
          </div>
        )}

        {showAdmin && (
          <div className="overlay" onMouseDown={e => e.stopPropagation()} style={{ zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ color: '#a855f7', margin: 0, fontSize: '1.1rem' }}>⚙ ADMIN PANEL</h2>
              <button className="back-btn" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setShowAdmin(false)}>✕ CLOSE</button>
            </div>
            <div className="shop-tabs" style={{ marginBottom: '0.75rem' }}>
              <button className={adminTab === 'stats' ? 'active' : ''} onClick={() => setAdminTab('stats')}>STATS</button>
              <button className={adminTab === 'users' ? 'active' : ''} onClick={() => { setAdminTab('users'); }}>USERS</button>
            </div>

            {adminTab === 'stats' && adminStats && (
              <div className="sub-overlay" style={{ gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%', marginBottom: '0.5rem' }}>
                  {[
                    { label: 'Total Users', value: adminStats.totalUsers, color: '#3b82f6' },
                    { label: 'Subscribers', value: adminStats.subscribers, color: '#22c55e' },
                    { label: 'Revenue', value: `$${Number(adminStats.totalRevenue).toFixed(2)}`, color: '#fbbf24' },
                    { label: 'Free Users', value: adminStats.totalUsers - adminStats.subscribers, color: '#94a3b8' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Payments</div>
                  {adminStats.recentPayments.length === 0 && <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem' }}>No payments yet</div>}
                  {adminStats.recentPayments.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1e293b', fontSize: '0.7rem' }}>
                      <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>{p.email.split('@')[0]}</span>
                      <span style={{ color: '#22c55e' }}>${Number(p.amount).toFixed(2)}</span>
                      <span style={{ color: '#64748b' }}>{new Date(p.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: 1 }}>Top Players</div>
                  {adminStats.topPlayers.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #1e293b', fontSize: '0.7rem' }}>
                      <span style={{ color: '#94a3b8' }}>{i+1}. {p.email.split('@')[0]}</span>
                      <span style={{ color: '#fbbf24' }}>{p.high_score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'users' && (
              <div className="sub-overlay">
                {adminUsers.map(u => (
                  <div key={u.id} style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.6rem', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700 }}>{u.email.split('@')[0]}</span>
                      <span style={{ fontSize: '0.65rem', color: u.is_subscribed ? '#22c55e' : '#ef4444', background: u.is_subscribed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{u.is_subscribed ? 'SUBSCRIBED' : 'FREE'}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.4rem' }}>Score: {u.high_score} · Coins: ${Number(u.coins).toFixed(2)}</div>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {!u.is_subscribed
                        ? <button onClick={() => adminGrantSub(u.id)} style={{ flex: 1, background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '4px', padding: '3px', fontSize: '0.65rem', cursor: 'pointer' }}>+ SUB</button>
                        : <button onClick={() => adminRevokeSub(u.id)} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', padding: '3px', fontSize: '0.65rem', cursor: 'pointer' }}>REVOKE</button>
                      }
                      {u.email !== ADMIN_EMAIL && <button onClick={() => adminDeleteUser(u.id)} style={{ flex: 1, background: 'rgba(239,68,68,0.05)', border: '1px solid #334155', color: '#64748b', borderRadius: '4px', padding: '3px', fontSize: '0.65rem', cursor: 'pointer' }}>DELETE</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(gameState === 'START' || gameState === 'PLAYING' || gameState === 'GAMEOVER') && (
            <>
                <div className="hud">
                    <div className="hud-left">
                        <div className="score">PTS: {Math.floor(score)}</div>
                        <div className="distance">DIST: {Math.floor(distance)}m</div>
                        <div className="rank-tag" style={{ color: getRank(highScore).color }}>{getRank(highScore).title}</div>
                    </div>
                    <div className="hud-right">
                        <div className="wallet" style={{ color: '#22c55e' }}>${typeof coins === 'number' ? coins.toFixed(2) : '0.00'}</div>
                        {user?.email === ADMIN_EMAIL && (
                          <div className="hud-logout" style={{ background: 'rgba(168,85,247,0.2)', borderColor: 'rgba(168,85,247,0.5)', color: '#a855f7' }} onClick={() => { fetchAdminStats(); setShowAdmin(true); }}>ADMIN</div>
                        )}
                        <div className="hud-logout" onClick={() => setToken('')}><LogOut size={16}/></div>
                    </div>
                </div>
                <div className="powerup-bar">
                    {activePowerUps.shield && <Shield size={20} color="#3b82f6" className="p-icon" />}
                    {activePowerUps.magnet > 0 && <Magnet size={20} color="#a855f7" className="p-icon pulse" />}
                    {activePowerUps.boost > 0 && <Zap size={20} color="#22c55e" className="p-icon pulse" />}
                </div>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onMouseDown={() => handleInput(true)}
                    onMouseUp={() => handleInput(false)}
                    onTouchStart={() => handleInput(true)}
                    onTouchEnd={() => handleInput(false)}
                />

                {showTutorial && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all', zIndex: 30 }}
                    onClick={() => { setShowTutorial(false); localStorage.setItem('tutorialSeen', '1'); }}
                    onTouchStart={() => { setShowTutorial(false); localStorage.setItem('tutorialSeen', '1'); }}>
                    <div style={{ textAlign: 'center', background: 'rgba(2,6,23,0.85)', borderRadius: '16px', padding: '1.5rem 2rem', border: '1px solid rgba(249,115,22,0.4)' }}>
                      <div style={{ fontSize: '3rem', animation: 'bounce 0.6s infinite alternate' }}>👆</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f97316', marginTop: '0.5rem' }}>TAP TO FLY</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem' }}>Hold to climb · Release to dive</div>
                      <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.75rem' }}>Tap anywhere to dismiss</div>
                    </div>
                  </div>
                )}
            </>
        )}

        {(gameState === 'START' || gameState === 'GAMEOVER') && (
          <div className="overlay" onMouseDown={(e) => e.stopPropagation()}>
            {overlayTab === 'MAIN' && (
                <>
                    <h1 style={{ color: gameState === 'GAMEOVER' ? '#ef4444' : '#f97316' }}>{gameState === 'GAMEOVER' ? 'CRASHED!' : 'READY TO DASH?'}</h1>
                    {gameState === 'GAMEOVER' && <div className="stats"><div>Score: {Math.floor(distance + score)}</div></div>}

                    {/* Guest conversion block */}
                    {isGuest && gameState === 'GAMEOVER' && (
                      <div style={{ width: '100%', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', padding: '0.85rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                        {guestPlays > 0 ? (
                          <>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.2rem' }}>⚡ {guestPlays} free {guestPlays === 1 ? 'play' : 'plays'} remaining</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Unlock infinite flights for just <span style={{ color: '#fbbf24', fontWeight: 800 }}>$0.05</span></div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.25rem' }}>🔒 Free plays used up!</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.6rem' }}>Unlock infinite flights for just <span style={{ color: '#22c55e', fontWeight: 900 }}>$0.05</span> — less than a candy!</div>
                            <button onClick={(e) => { e.stopPropagation(); setGameState('AUTH'); setIsRegistering(true); }} style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', color: '#fff', fontWeight: 900, padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}>
                              CREATE ACCOUNT & UNLOCK 🚀
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {!isGuest && <div className="best" style={{ color: getRank(highScore).color }}><Award size={24} /> {getRank(highScore).title}: {highScore}</div>}

                    {(isGuest && guestPlays > 0) || !isGuest ? (
                      <button className="start-btn" onClick={(e) => { e.stopPropagation(); resetGame(); }}>
                        {isGuest ? `▶ FLY AGAIN (${guestPlays} left)` : 'TAP TO FLY'}
                      </button>
                    ) : null}

                    {gameState === 'START' && !isGuest && (
                      <div className="overlay-nav">
                          <button onClick={(e) => { e.stopPropagation(); fetchLeaderboard(); setOverlayTab('LEADERBOARD'); }}><Trophy size={20} /> RANK</button>
                          <button onClick={(e) => { e.stopPropagation(); setOverlayTab('SHOP'); }}><ShoppingBag size={20} /> SHOP</button>
                          {user?.email === ADMIN_EMAIL && <button onClick={(e) => { e.stopPropagation(); fetchAdminStats(); setShowAdmin(true); }} style={{ background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7' }}>⚙ ADMIN</button>}
                      </div>
                    )}
                    {!isGuest && gameState === 'GAMEOVER' && (
                      <div className="overlay-nav">
                          <button onClick={(e) => { e.stopPropagation(); fetchLeaderboard(); setOverlayTab('LEADERBOARD'); }}><Trophy size={20} /> RANK</button>
                          <button onClick={(e) => { e.stopPropagation(); setOverlayTab('SHOP'); }}><ShoppingBag size={20} /> SHOP</button>
                          {user?.email === ADMIN_EMAIL && <button onClick={(e) => { e.stopPropagation(); fetchAdminStats(); setShowAdmin(true); }} style={{ background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7' }}>⚙ ADMIN</button>}
                      </div>
                    )}
                </>
            )}

            {overlayTab === 'LEADERBOARD' && (
                <div className="sub-overlay">
                    <h2><Trophy size={24} /> TOP PILOTS</h2>
                    <div className="leaderboard-list">
                        {leaderboard.map((p, i) => (
                            <div key={i} className="lb-row">
                                <span>{i+1}. {p.email.split('@')[0]}</span>
                                <span style={{ color: getRank(p.high_score).color, fontSize: '0.7rem' }}>[{getRank(p.high_score).title}]</span>
                                <span>{p.high_score}</span>
                            </div>
                        ))}
                    </div>
                    <button className="back-btn" onClick={(e) => { e.stopPropagation(); setOverlayTab('MAIN'); }}>BACK</button>
                </div>
            )}

            {overlayTab === 'SHOP' && (
                <div className="sub-overlay">
                    <h2><ShoppingBag size={24} /> CUSTOMIZE</h2>
                    <div className="shop-tabs">
                        {['skin', 'wings', 'beak', 'eyes', 'powerup'].map(cat => (
                            <button key={cat} className={shopCategory === cat ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setShopCategory(cat as any); }}>
                                {cat.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <p>Wallet: <span style={{ color: '#22c55e', fontWeight: 800 }}>${typeof coins === 'number' ? coins.toFixed(2) : '0.00'}</span></p>
                    {console.log('Current Category:', shopCategory)}
                    {console.log('Filtered Items:', SHOP_ITEMS.filter(i => i.category === shopCategory))}
                    <div className="shop-grid">
                        {SHOP_ITEMS.filter(i => i.category === shopCategory).length === 0 && <div style={{ gridColumn: '1/-1', padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No items found in this category.</div>}
                        {SHOP_ITEMS.filter(i => i.category === shopCategory).map(s => {
                            const isEquipped = [activeSkin, activeWings, activeBeak, activeEyes, activePowerUp].includes(s.id);
                            return (
                                <div key={s.id} className={`shop-item ${isEquipped ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); if (inventory.includes(s.id)) handleEquip(s); else handlePurchase(s); }}>
                                    <div className="skin-preview" style={{ background: s.color }} />
                                    <span>{s.name}</span>
                                    {!inventory.includes(s.id) && <span className="price">${s.price.toFixed(2)}</span>}
                                    {inventory.includes(s.id) && !isEquipped && <span className="owned">USE</span>}
                                    {isEquipped && <span className="active-tag">EQUIP</span>}
                                </div>
                            );
                        })}
                    </div>
                    <button className="back-btn" onClick={(e) => { e.stopPropagation(); setOverlayTab('MAIN'); }}>BACK</button>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
