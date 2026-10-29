// RevenueCat / In-App Purchase Service for Web, Capacitor & Native Mobile

export type SubscriptionPlan = 'annual' | 'lifetime';

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

class PurchaseService {
  private isProCached: boolean = false;
  private listeners: Set<(isPro: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_PRO_KEY);
        this.isProCached = stored === 'true';
      } catch {
        this.isProCached = false;
      }
    }
  }

  public isPro(): boolean {
    return this.isProCached;
  }

  public subscribe(callback: (isPro: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isProCached);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isProCached));
  }

  /**
   * Set Pro status (supports mock testing toggle in Web, or real receipt validation)
   */
  public setProStatus(isPro: boolean): void {
    this.isProCached = isPro;
    try {
      localStorage.setItem(LOCAL_STORAGE_PRO_KEY, String(isPro));
    } catch {
      // ignore
    }
    this.notify();
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
            this.setProStatus(true);
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
    this.setProStatus(true);
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
        this.setProStatus(hasPro);
        if (hasPro) {
          return { success: true, message: '✓ 已成功恢復您的 Pro 專業版權益！' };
        }
        return { success: false, message: '查無過往購買紀錄。' };
      } catch {
        return { success: false, message: '恢復失敗，請確認網路連線或登入帳號。' };
      }
    }

    // Web simulation
    await new Promise((r) => setTimeout(r, 450));
    const stored = localStorage.getItem(LOCAL_STORAGE_PRO_KEY) === 'true';
    this.setProStatus(stored);
    if (stored) {
      return { success: true, message: '✓ 已成功恢復您的 Pro 權益！' };
    }
    return { success: false, message: '目前無已儲存的購買紀錄，可使用下方測試開關切換體驗。' };
  }
}

export const purchaseService = new PurchaseService();

