// RevenueCat / In-App Purchase Service for Web, Capacitor & Native Mobile

export type SubscriptionPlan = 'annual' | 'lifetime';
export type AppTier = 'free' | 'pro' | 'admin';

export interface PlanDetails {
  id: SubscriptionPlan;
  title: string;
  tagline: string;
  priceFormatted: string;
  usdFormatted: string;
  badge?: string;
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: PlanDetails[] = [
  {
    id: 'annual',
    title: '年度生還計畫',
    tagline: '每個月不到一顆茶葉蛋，守護整年心靈健康',
    priceFormatted: 'NT$99 / 年',
    usdFormatted: '$3.99 / yr',
    badge: '最推薦',
    isPopular: true,
  },
  {
    id: 'lifetime',
    title: '終身擺爛通行證',
    tagline: '一次買斷，終身享有全部角色與行事曆毒舌開酸',
    priceFormatted: 'NT$190 終身買斷',
    usdFormatted: '$5.99 Lifetime',
  },
];

const LOCAL_STORAGE_PRO_KEY = 'ganhua_pro_subscription_v1';
const LOCAL_STORAGE_TIER_KEY = 'ganhua_app_tier_v2';
const LOCAL_STORAGE_ADMIN_AUTH_KEY = 'ganhua_admin_authenticated_v2';

const MASTER_PASSWORDS = ['ganhua2026', '8888'];

type SubscriptionListener = (
  isPro: boolean,
  tier: AppTier,
  isAdmin: boolean,
  isAdminAuthed: boolean
) => void;

class PurchaseService {
  private tier: AppTier = 'free';
  private isAdminAuthed: boolean = false;
  private listeners: Set<SubscriptionListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const authed = localStorage.getItem(LOCAL_STORAGE_ADMIN_AUTH_KEY) === 'true';
        this.isAdminAuthed = authed;

        if (authed) {
          const storedTier = localStorage.getItem(LOCAL_STORAGE_TIER_KEY) as AppTier | null;
          if (storedTier && (storedTier === 'free' || storedTier === 'pro' || storedTier === 'admin')) {
            this.tier = storedTier;
          } else {
            this.tier = 'admin';
          }
        } else {
          // Unauthenticated standard user: default to Free unless legitimate pro is recorded
          const isProUser = localStorage.getItem(LOCAL_STORAGE_PRO_KEY) === 'true';
          this.tier = isProUser ? 'pro' : 'free';
        }
      } catch {
        this.tier = 'free';
        this.isAdminAuthed = false;
      }
    }
  }

  public getTier(): AppTier {
    return this.tier;
  }

  public isPro(): boolean {
    return this.tier === 'pro' || this.tier === 'admin';
  }

  public isAdmin(): boolean {
    return this.tier === 'admin';
  }

  public isAdminAuthenticated(): boolean {
    return this.isAdminAuthed;
  }

  public verifyAdminPassword(inputPassword: string): boolean {
    const cleaned = (inputPassword || '').trim();
    const envPwd =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ADMIN_PASSWORD) || '';
    const valid = [...MASTER_PASSWORDS, envPwd].filter(Boolean);

    if (valid.includes(cleaned)) {
      this.isAdminAuthed = true;
      this.tier = 'admin';
      try {
        localStorage.setItem(LOCAL_STORAGE_ADMIN_AUTH_KEY, 'true');
        localStorage.setItem(LOCAL_STORAGE_TIER_KEY, 'admin');
        localStorage.setItem(LOCAL_STORAGE_PRO_KEY, 'true');
      } catch {
        // ignore
      }
      this.notify();
      return true;
    }
    return false;
  }

  public logoutAdmin(): void {
    this.isAdminAuthed = false;
    this.tier = 'free';
    try {
      localStorage.removeItem(LOCAL_STORAGE_ADMIN_AUTH_KEY);
      localStorage.setItem(LOCAL_STORAGE_TIER_KEY, 'free');
      localStorage.setItem(LOCAL_STORAGE_PRO_KEY, 'false');
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(callback: SubscriptionListener): () => void {
    this.listeners.add(callback);
    callback(this.isPro(), this.tier, this.isAdmin(), this.isAdminAuthed);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const pro = this.isPro();
    const admin = this.isAdmin();
    const authed = this.isAdminAuthed;
    this.listeners.forEach((cb) => cb(pro, this.tier, admin, authed));
  }

  /**
   * Set user tier directly (Free, Pro, Admin) - Requires Admin auth to change to Admin or Pro
   */
  public setTier(tier: AppTier): boolean {
    if ((tier === 'admin' || tier === 'pro') && !this.isAdminAuthed) {
      return false;
    }
    this.tier = tier;
    try {
      localStorage.setItem(LOCAL_STORAGE_TIER_KEY, tier);
      localStorage.setItem(LOCAL_STORAGE_PRO_KEY, String(tier === 'pro' || tier === 'admin'));
    } catch {
      // ignore
    }
    this.notify();
    return true;
  }

  /**
   * Set Pro status (legacy compatibility helper)
   */
  public setProStatus(isPro: boolean): void {
    if (isPro) {
      if (this.tier !== 'admin') {
        this.setTier('pro');
      }
    } else {
      this.setTier('free');
    }
  }

  /**
   * Simulate or execute purchase
   */
  public async purchasePlan(planId: SubscriptionPlan): Promise<{ success: boolean; message: string }> {
    // Check if running on Capacitor native with RevenueCat
    const isNative =
      typeof window !== 'undefined' &&
      (window as any).Capacitor &&
      (window as any).Capacitor.isNativePlatform();

    if (isNative && (window as any).Purchases) {
      try {
        // Native RevenueCat purchase flow hook
        const purchases = (window as any).Purchases;
        const offerings = await purchases.getOfferings();
        const pkg = offerings.current?.availablePackages?.find(
          (p: any) => p.identifier.includes(planId) || p.packageType.toLowerCase().includes(planId)
        );
        if (pkg) {
          const res = await purchases.purchasePackage({ aPackage: pkg });
          if (res.customerInfo?.entitlements?.active?.pro) {
            this.setTier('pro');
            return { success: true, message: '🎉 購買成功！已解鎖社畜終極逃生包！' };
          }
        }
      } catch (e: any) {
        if (e.userCancelled) {
          return { success: false, message: '已取消購買' };
        }
      }
    }

    // Default Web simulation / testing mode
    await new Promise((r) => setTimeout(r, 600));
    if (this.tier !== 'admin') {
      this.setTier('pro');
    }
    return {
      success: true,
      message: `🎉 成功解鎖「${planId === 'annual' ? '年度生還計畫' : '終身擺爛通行證'}」！`,
    };
  }

  /**
   * Restore purchases (Google Play / App Store / Local verification)
   */
  public async restorePurchases(): Promise<{ success: boolean; message: string }> {
    const isNative =
      typeof window !== 'undefined' &&
      (window as any).Capacitor &&
      (window as any).Capacitor.isNativePlatform();

    if (isNative && (window as any).Purchases) {
      try {
        const { customerInfo } = await (window as any).Purchases.restorePurchases();
        const hasPro = Boolean(customerInfo?.entitlements?.active?.pro);
        if (hasPro) {
          if (this.tier !== 'admin') this.setTier('pro');
          return { success: true, message: '✓ 已成功恢復您的 Pro 專業版權益！' };
        }
        return { success: false, message: '查無過往購買紀錄。' };
      } catch {
        return { success: false, message: '恢復失敗，請確認網路連線或登入帳號。' };
      }
    }

    // Web simulation
    await new Promise((r) => setTimeout(r, 450));
    const isPro = this.isPro();
    if (isPro) {
      return { success: true, message: '✓ 已成功恢復您的 Pro 權益！' };
    }
    return { success: false, message: '目前無已儲存的購買紀錄，可使用控制台切換體驗。' };
  }
}

export const purchaseService = new PurchaseService();


