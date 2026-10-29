import { useState, useEffect } from 'react';
import { purchaseService, SubscriptionPlan, AppTier } from '../services/purchaseService';

export function useSubscription() {
  const [tier, setTierState] = useState<AppTier>(() => purchaseService.getTier());
  const [isPro, setIsPro] = useState<boolean>(() => purchaseService.isPro());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => purchaseService.isAdmin());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = purchaseService.subscribe((proVal, tierVal, adminVal) => {
      setIsPro(proVal);
      setTierState(tierVal);
      setIsAdmin(adminVal);
    });
    return unsubscribe;
  }, []);

  const setTier = (newTier: AppTier) => {
    purchaseService.setTier(newTier);
  };

  const purchase = async (plan: SubscriptionPlan) => {
    setIsLoading(true);
    try {
      return await purchaseService.purchasePlan(plan);
    } finally {
      setIsLoading(false);
    }
  };

  const restore = async () => {
    setIsLoading(true);
    try {
      return await purchaseService.restorePurchases();
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMockPro = () => {
    if (tier === 'free') {
      purchaseService.setTier('pro');
    } else if (tier === 'pro') {
      purchaseService.setTier('admin');
    } else {
      purchaseService.setTier('free');
    }
  };

  return {
    tier,
    isPro,
    isAdmin,
    isLoading,
    setTier,
    purchase,
    restore,
    toggleMockPro,
  };
}


