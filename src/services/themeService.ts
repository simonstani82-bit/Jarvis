/**
 * JARVIS HUD Theme Manager
 * Dynamically updates CSS root variables in index.css
 */

export interface HudTheme {
  id: string;
  name: string;
  primary: string;
  primaryRgb: string;
  secondary: string;
  secondaryRgb: string;
  glow: string;
  dim: string;
  border: string;
  cardBg: string;
  accentBg: string;
  badge: string;
  description: string;
}

export const HUD_THEMES: HudTheme[] = [
  {
    id: 'classic-cyan',
    name: 'Classic Cyan',
    primary: '#00f0ff',
    primaryRgb: '0, 240, 255',
    secondary: '#0ea5e9',
    secondaryRgb: '14, 165, 233',
    glow: 'rgba(0, 240, 255, 0.55)',
    dim: 'rgba(0, 240, 255, 0.15)',
    border: 'rgba(0, 240, 255, 0.35)',
    cardBg: 'rgba(6, 15, 30, 0.75)',
    accentBg: 'rgba(0, 240, 255, 0.08)',
    badge: 'MARK LXXXV // STANDARD',
    description: 'Holographische Standard-Telemetrie von Stark Industries.',
  },
  {
    id: 'protocol-red',
    name: 'Protocol Red',
    primary: '#ff3344',
    primaryRgb: '255, 51, 68',
    secondary: '#b91c1c',
    secondaryRgb: '185, 28, 28',
    glow: 'rgba(255, 51, 68, 0.6)',
    dim: 'rgba(255, 51, 68, 0.18)',
    border: 'rgba(255, 51, 68, 0.45)',
    cardBg: 'rgba(28, 6, 10, 0.8)',
    accentBg: 'rgba(255, 51, 68, 0.1)',
    badge: 'VERONICA // COMBAT DEFENSE',
    description: 'Gefechts- und Notfall-Protokoll mit erhöhtem Kontrast.',
  },
  {
    id: 'stealth-green',
    name: 'Stealth Green',
    primary: '#00ff88',
    primaryRgb: '0, 255, 136',
    secondary: '#059669',
    secondaryRgb: '5, 150, 105',
    glow: 'rgba(0, 255, 136, 0.55)',
    dim: 'rgba(0, 255, 136, 0.15)',
    border: 'rgba(0, 255, 136, 0.4)',
    cardBg: 'rgba(6, 28, 16, 0.8)',
    accentBg: 'rgba(0, 255, 136, 0.08)',
    badge: 'STEALTH OPS // NIGHT VISION',
    description: 'Taktische Nachtsicht- und Infiltrationsmatrix.',
  },
  {
    id: 'arc-gold',
    name: 'Arc Gold',
    primary: '#fbbf24',
    primaryRgb: '251, 191, 36',
    secondary: '#d97706',
    secondaryRgb: '217, 119, 6',
    glow: 'rgba(251, 191, 36, 0.6)',
    dim: 'rgba(251, 191, 36, 0.18)',
    border: 'rgba(251, 191, 36, 0.45)',
    cardBg: 'rgba(28, 20, 6, 0.8)',
    accentBg: 'rgba(251, 191, 36, 0.1)',
    badge: 'MIDAS MARK XXI // HIGH POWER',
    description: 'Reaktorenergie auf Maximalstufe und Luxus-Legierung.',
  },
  {
    id: 'quantum-purple',
    name: 'Quantum Violet',
    primary: '#c084fc',
    primaryRgb: '192, 132, 252',
    secondary: '#7e22ce',
    secondaryRgb: '126, 34, 206',
    glow: 'rgba(192, 132, 252, 0.6)',
    dim: 'rgba(192, 132, 252, 0.18)',
    border: 'rgba(192, 132, 252, 0.45)',
    cardBg: 'rgba(24, 8, 35, 0.8)',
    accentBg: 'rgba(192, 132, 252, 0.1)',
    badge: 'QUANTUM REALM // FLUX CORE',
    description: 'Vibranium-basierte Quanten-Subraum-Telemetrie.',
  },
];

const STORAGE_KEY = 'jarvis_hud_theme_v1';

export const themeService = {
  getCurrentThemeId(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && HUD_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'classic-cyan';
  },

  getCurrentTheme(): HudTheme {
    const id = this.getCurrentThemeId();
    return HUD_THEMES.find((t) => t.id === id) || HUD_THEMES[0];
  },

  applyTheme(themeId: string): HudTheme {
    const theme = HUD_THEMES.find((t) => t.id === themeId) || HUD_THEMES[0];
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Dynamically update CSS root variables in index.css
      root.style.setProperty('--hud-primary', theme.primary);
      root.style.setProperty('--hud-primary-rgb', theme.primaryRgb);
      root.style.setProperty('--hud-secondary', theme.secondary);
      root.style.setProperty('--hud-secondary-rgb', theme.secondaryRgb);
      root.style.setProperty('--hud-glow', theme.glow);
      root.style.setProperty('--hud-dim', theme.dim);
      root.style.setProperty('--hud-border', theme.border);
      root.style.setProperty('--hud-card-bg', theme.cardBg);
      root.style.setProperty('--hud-accent-bg', theme.accentBg);
      
      // Also set data attribute for CSS selectors
      root.setAttribute('data-hud-theme', theme.id);

      try {
        localStorage.setItem(STORAGE_KEY, theme.id);
      } catch {
        // Ignore
      }
    }
    return theme;
  },

  initTheme(): HudTheme {
    const currentId = this.getCurrentThemeId();
    return this.applyTheme(currentId);
  },
};
