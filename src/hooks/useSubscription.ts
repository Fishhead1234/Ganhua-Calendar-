import { useState, useEffect } from 'react';
import { purchaseService, SubscriptionPlan, AppTier } from '../services/purchaseService';

export function useSubscription() {
  const [tier, setTierState] = useState<AppTier>(() => purchaseService.getTier());
  const [isPro, setIsPro] = useState<boolean>(() => purchaseService.isPro());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => purchaseService.isAdmin());
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => purchaseService.isAdminAuthenticated());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = purchaseService.subscribe((proVal, tierVal, adminVal, authedVal) => {
      setIsPro(proVal);
      setTierState(tierVal);
      setIsAdmin(adminVal);
      setIsAdminAuthed(authedVal);
    });
    return unsubscribe;
  }, []);

  const loginAdmin = (password: string) => {
    return purchaseService.verifyAdminPassword(password);
  };

  const logoutAdmin = () => {
    purchaseService.logoutAdmin();
  };

  const setTier = (newTier: AppTier) => {
    return purchaseService.setTier(newTier);
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
    if (!isAdminAuthed) {
      return;
    }
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
    isAdminAuthed,
    isLoading,
    loginAdmin,
    logoutAdmin,
    setTier,
    purchase,
    restore,
    toggleMockPro,
  };
}


